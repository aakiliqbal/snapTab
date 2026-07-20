import type { RssFeedCache } from "./rss";

export const rssCachePolicy = {
  maxFeeds: 50,
  maxItemsPerFeed: 30,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxSerializedBytes: 900_000
};

export function pruneRssCache(
  cache: Record<string, RssFeedCache>,
  now = Date.now(),
  policy = rssCachePolicy
): Record<string, RssFeedCache> {
  const freshEntries = Object.entries(cache)
    .map(([url, value]) => [url, pruneFeedCache(value, policy.maxItemsPerFeed)] as const)
    .filter(([, value]) => now - Date.parse(value.lastFetchedAt) <= policy.maxAgeMs)
    .sort(([, first], [, second]) => Date.parse(second.lastFetchedAt) - Date.parse(first.lastFetchedAt))
    .slice(0, policy.maxFeeds);

  let entries = freshEntries;
  while (entries.length > 0 && serializedBytes(Object.fromEntries(entries)) > policy.maxSerializedBytes) {
    entries = entries.slice(0, -1);
  }

  return Object.fromEntries(entries);
}

function pruneFeedCache(value: RssFeedCache, maxItemsPerFeed: number): RssFeedCache {
  return {
    ...value,
    items: value.items.slice(0, maxItemsPerFeed)
  };
}

function serializedBytes(value: unknown) {
  return new Blob([JSON.stringify(value)]).size;
}
