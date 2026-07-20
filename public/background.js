const maxFeedBytes = 1_000_000;
const feedTimeoutMs = 10_000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SNAPTAB_FETCH_RSS_FEED" || typeof message.url !== "string") {
    return false;
  }

  fetchFeed(message.url)
    .then((response) => {
      sendResponse({
        ok: true,
        status: response.status,
        text: response.text
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        status: error instanceof FeedFetchError ? error.status : 0,
        code: error instanceof FeedFetchError ? error.code : "FETCH_FAILED",
        error: error instanceof Error ? error.message : "Feed unavailable."
      });
    });

  return true;
});

class FeedFetchError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = "FeedFetchError";
    this.code = code;
    this.status = status;
  }
}

async function fetchFeed(url) {
  const parsed = parseAllowedFeedUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), feedTimeoutMs);

  try {
    const response = await fetch(parsed.toString(), { signal: controller.signal });
    parseAllowedFeedUrl(response.url);
    if (!response.ok) {
      throw new FeedFetchError("HTTP_ERROR", `Feed returned ${response.status}.`, response.status);
    }

    assertReadableFeedContent(response.headers.get("content-type"));
    return { status: response.status, text: await readLimitedText(response) };
  } catch (error) {
    if (error instanceof FeedFetchError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FeedFetchError("TIMEOUT", "Feed request timed out.");
    }

    throw new FeedFetchError("FETCH_FAILED", error instanceof Error ? error.message : "Feed unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function parseAllowedFeedUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new FeedFetchError("INVALID_URL", "Feed URL is invalid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FeedFetchError("UNSUPPORTED_PROTOCOL", "Feed URL must use HTTP or HTTPS.");
  }

  if (isBlockedHost(url.hostname)) {
    throw new FeedFetchError("BLOCKED_HOST", "Feed URL points to a private or local host.");
  }

  return url;
}

function isBlockedHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    return true;
  }

  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function assertReadableFeedContent(contentType) {
  if (!contentType) {
    return;
  }

  const normalized = contentType.toLowerCase();
  if (
    normalized.includes("image/") ||
    normalized.includes("audio/") ||
    normalized.includes("video/") ||
    normalized.includes("application/octet-stream")
  ) {
    throw new FeedFetchError("UNSUPPORTED_CONTENT", "Feed response is not readable text.");
  }
}

async function readLimitedText(response) {
  if (!response.body) {
    const text = await response.text();
    if (new Blob([text]).size > maxFeedBytes) {
      throw new FeedFetchError("RESPONSE_TOO_LARGE", "Feed response is too large.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    bytesRead += value.byteLength;
    if (bytesRead > maxFeedBytes) {
      await reader.cancel();
      throw new FeedFetchError("RESPONSE_TOO_LARGE", "Feed response is too large.");
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
