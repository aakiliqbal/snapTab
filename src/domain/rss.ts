import type { RssFeed } from "./canvas";

export type RssItem = {
  id: string;
  feedId: string;
  feedTitle: string;
  title: string;
  link: string;
  snippet?: string;
  publishedAt?: string;
  author?: string;
  imageUrl?: string;
};

export type RssFeedCache = {
  feedUrl: string;
  items: RssItem[];
  lastFetchedAt: string;
  lastSuccessAt?: string;
  lastError?: string;
};

export type ParsedRssFeed = {
  title: string;
  items: RssItem[];
};

export function parseOpmlFeeds(xmlText: string): RssFeed[] {
  const document = parseXml(escapeLooseXmlAttributeAmpersands(xmlText), "OPML file");
  const outlines = Array.from(document.querySelectorAll("outline"));
  const seenUrls = new Set<string>();
  const feeds: RssFeed[] = [];

  for (const outline of outlines) {
    const url = normalizeFeedUrl(outline.getAttribute("xmlUrl") ?? outline.getAttribute("xmlurl"));
    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    const title = normalizeText(outline.getAttribute("title") ?? outline.getAttribute("text")) ?? getFeedTitleFromUrl(url);
    feeds.push({ id: createRssFeedId(url), title, url });
  }

  return feeds;
}

export function serializeOpmlFeeds(feeds: RssFeed[]): string {
  const outlines = feeds
    .map((feed) => {
      const title = escapeXml(feed.title);
      const url = escapeXml(feed.url);
      return `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${url}" />`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    "    <title>SnapTab RSS Feeds</title>",
    "  </head>",
    "  <body>",
    outlines,
    "  </body>",
    "</opml>"
  ].join("\n");
}

export function parseRssXml(xmlText: string, feed: RssFeed): ParsedRssFeed {
  const document = parseXml(xmlText, "RSS feed");
  const channel = document.querySelector("channel");
  if (channel) {
    return parseRssChannel(channel, feed);
  }

  const atomFeed = document.querySelector("feed");
  if (atomFeed) {
    return parseAtomFeed(atomFeed, feed);
  }

  throw new Error("Unsupported RSS feed format.");
}

export function dedupeRssItems(items: RssItem[]): RssItem[] {
  const seen = new Set<string>();
  const deduped: RssItem[] = [];

  for (const item of items) {
    const key = item.link ? `${item.feedId}:${item.link}` : `${item.feedId}:${item.title}:${item.publishedAt ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function createRssFeedId(url: string) {
  return `rss-${hashString(url)}`;
}

export function normalizeFeedUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function parseRssChannel(channel: Element, feed: RssFeed): ParsedRssFeed {
  const feedTitle = readChildText(channel, "title") ?? feed.title;
  const items = Array.from(channel.querySelectorAll("item")).map((item) => {
    const title = readChildText(item, "title") ?? "Untitled";
    const link = readChildText(item, "link") ?? feed.url;
    const publishedAt = normalizeDateText(readChildText(item, "pubDate") ?? readChildText(item, "dc\\:date"));
    const snippet = normalizeSnippet(readChildText(item, "description") ?? readChildText(item, "content\\:encoded"));
    const author = normalizeText(readChildText(item, "author") ?? readChildText(item, "dc\\:creator")) ?? undefined;
    const imageUrl = getRssItemImageUrl(item, link ?? feed.url);
    const id = readChildText(item, "guid") ?? link ?? `${title}:${publishedAt ?? ""}`;

    return normalizeRssItem({ id, feed, feedTitle, title, link, publishedAt, snippet, author, imageUrl });
  });

  return { title: feedTitle, items: dedupeRssItems(items) };
}

function parseAtomFeed(atomFeed: Element, feed: RssFeed): ParsedRssFeed {
  const feedTitle = readChildText(atomFeed, "title") ?? feed.title;
  const entries = Array.from(atomFeed.querySelectorAll("entry"));
  const items = entries.map((entry) => {
    const title = readChildText(entry, "title") ?? "Untitled";
    const link = readAtomLink(entry) ?? feed.url;
    const publishedAt = normalizeDateText(readChildText(entry, "published") ?? readChildText(entry, "updated"));
    const snippet = normalizeSnippet(readChildText(entry, "summary") ?? readChildText(entry, "content"));
    const author = normalizeText(entry.querySelector("author > name")?.textContent) ?? undefined;
    const imageUrl = getHtmlImageUrl(readChildText(entry, "content") ?? readChildText(entry, "summary"), link ?? feed.url);
    const id = readChildText(entry, "id") ?? link ?? `${title}:${publishedAt ?? ""}`;

    return normalizeRssItem({ id, feed, feedTitle, title, link, publishedAt, snippet, author, imageUrl });
  });

  return { title: feedTitle, items: dedupeRssItems(items) };
}

function normalizeRssItem({
  id,
  feed,
  feedTitle,
  title,
  link,
  publishedAt,
  snippet,
  author,
  imageUrl
}: {
  id: string;
  feed: RssFeed;
  feedTitle: string;
  title: string;
  link: string;
  publishedAt?: string;
  snippet?: string;
  author?: string;
  imageUrl?: string;
}): RssItem {
  return {
    id: `${feed.id}:${hashString(id)}`,
    feedId: feed.id,
    feedTitle,
    title,
    link,
    ...(snippet ? { snippet } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(author ? { author } : {}),
    ...(imageUrl ? { imageUrl } : {})
  };
}

function getRssItemImageUrl(item: Element, baseUrl: string) {
  const mediaThumbnail = normalizeImageUrl(getElementsByLocalName(item, "thumbnail")[0]?.getAttribute("url"), baseUrl);
  if (mediaThumbnail) {
    return mediaThumbnail;
  }

  const mediaContent = getElementsByLocalName(item, "content")
    .map((element) => ({ type: element.getAttribute("type"), url: element.getAttribute("url") }))
    .find((media) => media.url && (!media.type || media.type.startsWith("image/")));
  const mediaContentUrl = normalizeImageUrl(mediaContent?.url, baseUrl);
  if (mediaContentUrl) {
    return mediaContentUrl;
  }

  const enclosure = Array.from(item.querySelectorAll("enclosure"))
    .map((element) => ({ type: element.getAttribute("type"), url: element.getAttribute("url") }))
    .find((candidate) => candidate.url && candidate.type?.startsWith("image/"));
  const enclosureUrl = normalizeImageUrl(enclosure?.url, baseUrl);
  if (enclosureUrl) {
    return enclosureUrl;
  }

  return getHtmlImageUrl(readChildText(item, "description") ?? readChildText(item, "content\\:encoded"), baseUrl);
}

function getElementsByLocalName(element: Element, localName: string) {
  return Array.from(element.getElementsByTagName("*")).filter((candidate) => candidate.localName === localName);
}

function getHtmlImageUrl(html: string | null | undefined, baseUrl: string) {
  const source = html?.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1];
  return normalizeImageUrl(source, baseUrl);
}

function normalizeImageUrl(value: string | null | undefined, baseUrl: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function readAtomLink(entry: Element) {
  const alternate = Array.from(entry.querySelectorAll("link")).find((link) => {
    const rel = link.getAttribute("rel");
    return !rel || rel === "alternate";
  });

  return normalizeText(alternate?.getAttribute("href") ?? alternate?.textContent);
}

function readChildText(element: Element, selector: string) {
  return normalizeText(element.querySelector(selector)?.textContent);
}

function normalizeText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeSnippet(value: string | null | undefined): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped ? stripped.slice(0, 280) : undefined;
}

function normalizeDateText(value: string | null | undefined): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function getFeedTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "RSS Feed";
  }
}

function parseXml(xmlText: string, label: string) {
  const document = new DOMParser().parseFromString(xmlText.trimStart(), "text/xml");
  if (document.querySelector("parsererror")) {
    throw new Error(`${label} is not valid XML.`);
  }

  return document;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeLooseXmlAttributeAmpersands(xmlText: string) {
  return xmlText.replace(/&(?!#\d+;|#x[\da-fA-F]+;|[a-zA-Z][\w.-]*;)/g, "&amp;");
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
