type ChromePermissions = {
  contains: (opts: { origins: string[] }) => Promise<boolean>;
  request: (opts: { origins: string[] }) => Promise<boolean>;
};

export type PermissionsResult = {
  granted: number;
  denied: number;
};

export type FeedFetchResponse = {
  ok: boolean;
  status: number;
  text?: string;
  code?: string;
  error?: string;
};

type SendRuntimeMessage = (message: unknown, callback: (response: unknown) => void) => void;

export async function fetchFeedText(url: string, signal?: AbortSignal): Promise<string> {
  const sendMessage = typeof chrome !== "undefined" ? chrome.runtime?.sendMessage : undefined;
  if (sendMessage) {
    await ensureOriginPermission(url);
    return fetchFeedTextViaBackground(url, signal, sendMessage);
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Feed returned ${response.status}.`);
  }

  return response.text();
}

export function fetchFeedTextViaBackground(
  url: string,
  signal: AbortSignal | undefined,
  sendMessage: SendRuntimeMessage
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    sendMessage({ type: "SNAPTAB_FETCH_RSS_FEED", url }, (response) => {
      signal?.removeEventListener("abort", abort);
      const lastError = chrome?.runtime?.lastError?.message;
      if (lastError) {
        reject(new Error(lastError));
        return;
      }

      if (!isFeedFetchResponse(response)) {
        reject(new Error("Feed fetch failed."));
        return;
      }

      if (!response.ok) {
        reject(new Error(response.error ?? response.code ?? `Feed returned ${response.status}.`));
        return;
      }

      resolve(response.text ?? "");
    });
  });
}

function getChromePermissions(): ChromePermissions | undefined {
  return (typeof chrome !== "undefined" ? (chrome as unknown as { permissions?: ChromePermissions }).permissions : undefined);
}

export function collectOriginPatterns(urls: string[]): string[] {
  return [...new Set(urls.map((url) => {
    const u = new URL(url);
    const hostParts = u.hostname.split(".");
    const wildcardHost = hostParts.length >= 2
      ? `*.${hostParts.slice(-2).join(".")}`
      : u.hostname;
    return `${u.protocol}//${wildcardHost}/*`;
  }))];
}

export async function requestPermissionsForUrls(urls: string[]): Promise<PermissionsResult> {
  const cp = getChromePermissions();
  if (!cp) return { granted: urls.length, denied: 0 };

  const origins = collectOriginPatterns(urls);
  if (origins.length === 0) return { granted: 0, denied: 0 };

  const responsePromise = cp.request({ origins });

  const granted = await responsePromise;
  return { granted: granted ? origins.length : 0, denied: granted ? 0 : origins.length };
}

async function ensureOriginPermission(url: string): Promise<void> {
  const cp = getChromePermissions();
  if (!cp) return;

  const urlObj = new URL(url);
  const hostParts = urlObj.hostname.split(".");
  const pattern = `${urlObj.protocol}//${hostParts.length >= 2 ? `*.${hostParts.slice(-2).join(".")}` : urlObj.hostname}/*`;

  if (await cp.contains({ origins: [pattern] })) return;

  const granted = await cp.request({ origins: [pattern] });
  if (!granted) {
    throw new Error(
      `Permission needed for ${urlObj.hostname}. Open the Snap Feed context menu and use 'Check feeds' to grant access.`
    );
  }
}

function isFeedFetchResponse(value: unknown): value is FeedFetchResponse {
  return isRecord(value) && typeof value.ok === "boolean" && typeof value.status === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
