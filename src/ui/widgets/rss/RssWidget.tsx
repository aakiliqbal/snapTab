import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw, Rss } from "lucide-react";
import type { RssWidgetSettings } from "../../../domain/canvas";
import type { RssItem } from "../../../domain/rss";
import { getWidgetSurfaceStyle } from "../widgetSurface";
import { fetchRssItems, type RssFeedFailure } from "./rssService";

type RssWidgetProps = {
  settings: RssWidgetSettings;
};

type RssItemVisualProps = {
  displayMode: RssWidgetSettings["displayMode"];
  feedUrl: string;
  item: RssItem;
};

type RssStatus =
  | { type: "empty" }
  | { type: "loading" }
  | { type: "ready"; items: RssItem[]; failures: RssFeedFailure[] }
  | { type: "error"; failures: RssFeedFailure[] };

export function RssWidget({ settings }: RssWidgetProps) {
  const [status, setStatus] = useState<RssStatus>(() => (settings.feeds.length === 0 ? { type: "empty" } : { type: "loading" }));
  const [refreshNonce, setRefreshNonce] = useState(0);
  const forceRefreshRef = useRef(false);
  const surfaceStyle = getRssSurfaceStyle(settings);

  function refreshFeeds() {
    forceRefreshRef.current = true;
    setRefreshNonce((current) => current + 1);
  }

  useEffect(() => {
    if (settings.feeds.length === 0) {
      setStatus({ type: "empty" });
      return;
    }

    const controller = new AbortController();
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setStatus({ type: "loading" });
    fetchRssItems(settings, controller.signal, { forceRefresh })
      .then((result) => {
        if (result.items.length === 0 && result.failures.length > 0) {
          setStatus({ type: "error", failures: result.failures });
          return;
        }

        setStatus({ type: "ready", items: result.items, failures: result.failures });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatus({
          type: "error",
          failures: [{ feedId: "rss", title: "Snap Feed", message: error instanceof Error ? error.message : "Snap Feed unavailable." }]
        });
      });

    return () => controller.abort();
  }, [settings.feeds, settings.feedMode, settings.selectedFeedId, settings.maxItems, settings.maxItemsPerFeed, settings.refreshMinutes, refreshNonce]);

  if (status.type === "empty") {
    return (
      <section className="rss-widget widget-surface rss-widget-empty" aria-label="Snap Feed empty" style={surfaceStyle}>
        <Rss aria-hidden="true" />
        <div>
          <strong>No Snap Feed sources</strong>
          <span>Add feeds from Edit Mode.</span>
        </div>
      </section>
    );
  }

  if (status.type === "loading") {
    return (
      <section className="rss-widget widget-surface rss-widget-loading" aria-label="Snap Feed loading" style={surfaceStyle}>
        <LoaderCircle aria-hidden="true" className="rss-spin" />
        <span>Loading feeds</span>
      </section>
    );
  }

  if (status.type === "error") {
    return (
      <section className="rss-widget widget-surface rss-widget-error" aria-label="Snap Feed error" style={surfaceStyle}>
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Snap Feed unavailable</strong>
          <span>{status.failures[0]?.message ?? "Feeds could not be loaded."}</span>
        </div>
      </section>
    );
  }

  return <RssItemsView failures={status.failures} items={status.items} onRefresh={refreshFeeds} settings={settings} surfaceStyle={surfaceStyle} />;
}

function RssItemsView({
  failures,
  items,
  onRefresh,
  settings,
  surfaceStyle
}: {
  failures: RssFeedFailure[];
  items: RssItem[];
  onRefresh: () => void;
  settings: RssWidgetSettings;
  surfaceStyle: CSSProperties;
}) {
  const mode = settings.displayMode;

  return (
    <section className={`rss-widget widget-surface rss-widget-${mode}`} aria-label="Snap Feed" style={surfaceStyle}>
      <header className="rss-widget-header">
        <span className="rss-widget-icon" aria-hidden="true"><Rss /></span>
        <div className="rss-widget-title">
          <strong>Snap Feed</strong>
          <span>{settings.feedMode === "selected" ? getSelectedFeedTitle(settings) : `${settings.feeds.length} feeds`}</span>
        </div>
        <button className="rss-refresh-button" onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" />
          <span>{failures.length} failed</span>
        </button>
      </header>

      <div className="rss-items" role="list">
        {items.map((item) => (
          <a className="rss-item" href={item.link} key={item.id} rel="noreferrer" role="listitem" target="_blank">
            <div className="rss-item-row">
              <RssItemVisual displayMode={mode} feedUrl={getFeedUrl(settings, item.feedId)} item={item} />
              <div className="rss-item-content">
                <strong>{item.title}</strong>
                <span className="rss-item-meta">
                  {settings.showSource ? <span>{item.feedTitle}</span> : null}
                  {formatRelativeTime(item.publishedAt) ? <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt)}</time> : null}
                </span>
                {mode === "expanded" && settings.showSnippet && item.snippet ? <small>{item.snippet}</small> : null}
              </div>
            </div>
          </a>
        ))}
      </div>

      {failures.length > 0 ? <p className="rss-failures">{failures.length} feed{failures.length === 1 ? "" : "s"} failed</p> : null}
    </section>
  );
}

function RssItemVisual({ displayMode, feedUrl, item }: RssItemVisualProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageUrl = item.imageUrl && item.imageUrl !== failedImageUrl ? item.imageUrl : getFeedFaviconUrl(feedUrl);
  const showImage = imageUrl && imageUrl !== failedImageUrl;

  return (
    <span className={`rss-item-visual rss-item-visual-${displayMode}`} aria-hidden="true">
      {showImage ? (
        <img alt="" src={imageUrl} onError={() => setFailedImageUrl(imageUrl)} />
      ) : (
        <span className="rss-item-initials">{getFeedInitials(item.feedTitle)}</span>
      )}
    </span>
  );
}

function getSelectedFeedTitle(settings: RssWidgetSettings) {
  return settings.feeds.find((feed) => feed.id === settings.selectedFeedId)?.title ?? "Selected feed";
}

function getFeedUrl(settings: RssWidgetSettings, feedId: string) {
  return settings.feeds.find((feed) => feed.id === feedId)?.url ?? "";
}

function getFeedFaviconUrl(feedUrl: string): string | undefined {
  try {
    const hostname = new URL(feedUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return undefined;
  }
}

function getFeedInitials(feedTitle: string): string {
  const words = feedTitle.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "R";
  }

  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;
  return initials.toUpperCase();
}

function formatRelativeTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const elapsedMs = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsedMs)) {
    return null;
  }

  const minutes = Math.max(0, Math.floor(elapsedMs / 60_000));
  if (minutes < 60) {
    return `${minutes || 1}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
}

function getRssSurfaceStyle(settings: RssWidgetSettings) {
  return {
    ...getWidgetSurfaceStyle(settings),
    "--widget-padding": "clamp(12px, 7%, 18px)",
    "--widget-radius": "24px"
  } as CSSProperties;
}
