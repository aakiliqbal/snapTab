import type { RssFeed, RssWidgetSettings } from "../../../domain/canvas";
import { dedupeRssItems, parseRssXml, type RssFeedCache, type RssItem } from "../../../domain/rss";
import { pruneRssCache } from "../../../domain/rssCache";
import { fetchFeedText } from "../../../infrastructure/feedFetch";

export type RssFeedFailure = {
  feedId: string;
  title: string;
  message: string;
};

export type RssFetchResult = {
  items: RssItem[];
  failures: RssFeedFailure[];
};

type RssFetchOptions = {
  forceRefresh?: boolean;
};

const cache = new Map<string, RssFeedCache>();
const persistentRssCacheKey = "snapTabRssCache";

export async function fetchRssItems(settings: RssWidgetSettings, signal?: AbortSignal, options: RssFetchOptions = {}): Promise<RssFetchResult> {
  const feeds = getActiveFeeds(settings);
  if (feeds.length === 0) {
    return { items: [], failures: [] };
  }

  const results = await Promise.all(feeds.map((feed) => fetchFeedItems(feed, settings.refreshMinutes, signal, options)));
  const maxItemsPerFeed = settings.feedMode === "selected" ? settings.maxItems : settings.maxItemsPerFeed;
  const items = dedupeRssItems(results.flatMap((result) => limitFeedItems(result.items, maxItemsPerFeed)))
    .sort((first, second) => getItemTime(second) - getItemTime(first))
    .slice(0, settings.maxItems);
  const failures = results.flatMap((result) => result.failure ? [result.failure] : []);

  return { items, failures };
}

export async function checkRssFeed(feed: RssFeed, signal?: AbortSignal): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const parsed = parseRssXml(await fetchFeedText(feed.url, signal), feed);
    const now = new Date().toISOString();
    const nextCache: RssFeedCache = {
      feedUrl: feed.url,
      items: parsed.items,
      lastFetchedAt: now,
      lastSuccessAt: now
    };

    cache.set(feed.url, nextCache);
    await writePersistentCache(feed.url, nextCache);
    return { ok: true };
  } catch (error) {
    if (signal?.aborted) {
      return { ok: false, message: "Check cancelled." };
    }

    return { ok: false, message: error instanceof Error ? error.message : "Feed unavailable." };
  }
}

function limitFeedItems(items: RssItem[], maxItemsPerFeed: number) {
  return [...items].sort((first, second) => getItemTime(second) - getItemTime(first)).slice(0, maxItemsPerFeed);
}

async function fetchFeedItems(
  feed: RssFeed,
  refreshMinutes: number,
  signal?: AbortSignal,
  options: RssFetchOptions = {}
): Promise<{ items: RssItem[]; failure: RssFeedFailure | null }> {
  const cached = await getCachedFeed(feed.url);
  if (!options.forceRefresh && cached && isFresh(cached, refreshMinutes)) {
    return { items: withFeedMetadata(cached.items, feed), failure: null };
  }

  try {
    const xmlText = await fetchFeedText(feed.url, signal);
    const parsed = parseRssXml(xmlText, feed);
    const now = new Date().toISOString();
    const nextCache: RssFeedCache = {
      feedUrl: feed.url,
      items: parsed.items,
      lastFetchedAt: now,
      lastSuccessAt: now
    };

    cache.set(feed.url, nextCache);
    await writePersistentCache(feed.url, nextCache);
    return { items: withFeedMetadata(parsed.items, { ...feed, title: parsed.title }), failure: null };
  } catch (error) {
    if (signal?.aborted) {
      return { items: [], failure: null };
    }

    const message = error instanceof Error ? error.message : "Feed unavailable.";
    const failedCache: RssFeedCache = {
      feedUrl: feed.url,
      items: cached?.items ?? [],
      lastFetchedAt: new Date().toISOString(),
      ...(cached?.lastSuccessAt ? { lastSuccessAt: cached.lastSuccessAt } : {}),
      lastError: message
    };
    cache.set(feed.url, failedCache);
    await writePersistentCache(feed.url, failedCache);

    return {
      items: cached ? withFeedMetadata(cached.items, feed) : [],
      failure: { feedId: feed.id, title: feed.title, message }
    };
  }
}

function getActiveFeeds(settings: RssWidgetSettings) {
  if (settings.feedMode !== "selected") {
    return settings.feeds;
  }

  return settings.feeds.filter((feed) => feed.id === settings.selectedFeedId);
}

function withFeedMetadata(items: RssItem[], feed: RssFeed) {
  return items.map((item) => ({ ...item, feedId: feed.id, feedTitle: feed.title }));
}

function isFresh(cached: RssFeedCache, refreshMinutes: number) {
  return Date.now() - Date.parse(cached.lastFetchedAt) < refreshMinutes * 60_000;
}

async function getCachedFeed(feedUrl: string): Promise<RssFeedCache | null> {
  const memory = cache.get(feedUrl);
  if (memory) {
    return memory;
  }

  const persistentCache = await readPersistentCache();
  const persistent = persistentCache[feedUrl];
  if (isRssFeedCache(persistent)) {
    cache.set(feedUrl, persistent);
    return persistent;
  }

  return null;
}

async function readPersistentCache(): Promise<Record<string, unknown>> {
  const chromeLocal = typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
  if (chromeLocal) {
    return new Promise((resolve) => {
      chromeLocal.get([persistentRssCacheKey], (items) => {
        resolve(isRecord(items[persistentRssCacheKey]) ? (items[persistentRssCacheKey] as Record<string, unknown>) : {});
      });
    });
  }

  try {
    const value = window.localStorage.getItem(persistentRssCacheKey);
    const parsed = value ? (JSON.parse(value) as unknown) : null;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writePersistentCache(feedUrl: string, value: RssFeedCache) {
  const currentCache = Object.fromEntries(
    Object.entries(await readPersistentCache()).filter((entry): entry is [string, RssFeedCache] => isRssFeedCache(entry[1]))
  );
  const nextCache = pruneRssCache({ ...currentCache, [feedUrl]: value });
  const chromeLocal = typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
  if (chromeLocal) {
    await new Promise<void>((resolve) => chromeLocal.set({ [persistentRssCacheKey]: nextCache }, () => resolve()));
    return;
  }

  window.localStorage.setItem(persistentRssCacheKey, JSON.stringify(nextCache));
}

function getItemTime(item: RssItem) {
  return item.publishedAt ? Date.parse(item.publishedAt) || 0 : 0;
}

function isRssFeedCache(value: unknown): value is RssFeedCache {
  return (
    isRecord(value) &&
    typeof value.feedUrl === "string" &&
    Array.isArray(value.items) &&
    typeof value.lastFetchedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
