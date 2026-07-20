import { useRef, useState, type FormEvent } from "react";
import type { RssDisplayMode, RssFeed, RssFeedMode, RssWidgetSettings, WidgetState } from "../../../domain/canvas";
import { createRssFeedId, normalizeFeedUrl, parseOpmlFeeds, serializeOpmlFeeds } from "../../../domain/rss";
import { RangeRow, WidgetVisualControls } from "../WidgetContextMenuControls";
import { checkRssFeed } from "./rssService";
import { requestPermissionsForUrls } from "../../../infrastructure/feedFetch";

type RssWidgetContextMenuProps = {
  changeRssWidgetSetting: <K extends keyof RssWidgetSettings>(key: K, value: RssWidgetSettings[K]) => void;
  changeRssWidgetSettings: (settings: Partial<RssWidgetSettings>) => void;
  rssWidget: WidgetState<RssWidgetSettings>;
  setEnabled: (enabled: boolean) => void;
};

type FeedCheckStatus =
  | { state: "checking"; message: string }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

type PendingFeedCheck = {
  feeds: RssFeed[];
  importedCount: number;
  selectedFeedId: string | null;
};

export function RssWidgetContextMenu({
  changeRssWidgetSetting,
  changeRssWidgetSettings,
  rssWidget,
  setEnabled
}: RssWidgetContextMenuProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedTitle, setFeedTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [feedStatuses, setFeedStatuses] = useState<Record<string, FeedCheckStatus>>({});
  const [pendingFeedCheck, setPendingFeedCheck] = useState<PendingFeedCheck | null>(null);
  const importModeRef = useRef<"merge" | "replace">("merge");
  const settings = rssWidget.settings;

  function addFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = normalizeFeedUrl(feedUrl);
    if (!url) {
      setMessage("Enter a valid RSS URL.");
      return;
    }

    if (settings.feeds.some((feed) => normalizeFeedUrl(feed.url) === url)) {
      setMessage("Feed already exists.");
      return;
    }

    const nextFeed = {
      id: createRssFeedId(url),
      title: feedTitle.trim() || getFeedTitleFromUrl(url),
      url
    };
    const nextFeeds = [...settings.feeds, nextFeed];
    changeRssWidgetSettings({ feeds: nextFeeds, selectedFeedId: settings.selectedFeedId ?? nextFeed.id });
    setFeedUrl("");
    setFeedTitle("");
    setMessage("Feed added. Checking feed...");
    void checkFeeds([nextFeed], nextFeeds);
  }

  function removeFeed(feedId: string) {
    const feeds = settings.feeds.filter((feed) => feed.id !== feedId);
    changeRssWidgetSettings({
      feeds,
      selectedFeedId: settings.selectedFeedId === feedId ? feeds[0]?.id ?? null : settings.selectedFeedId
    });
  }

  async function importOpml(file: File | null, mode: "merge" | "replace") {
    if (!file) {
      return;
    }

    if (mode === "replace") {
      const shouldReplace = window.confirm(
        "Replace existing RSS feeds?\n\nThis will remove your current RSS feed list and replace it with feeds from the OPML file. Cached articles may be cleared."
      );
      if (!shouldReplace) {
        setMessage("OPML replace cancelled.");
        return;
      }
    }

    try {
      const importedFeeds = parseOpmlFeeds(await file.text());
      const feeds = mode === "replace" ? importedFeeds : mergeFeeds(settings.feeds, importedFeeds);
      if (mode === "replace") {
        setFeedStatuses({});
      }

      const selectedFeedId = settings.selectedFeedId && feeds.some((feed) => feed.id === settings.selectedFeedId) ? settings.selectedFeedId : feeds[0]?.id ?? null;
      setPendingFeedCheck({ feeds, importedCount: importedFeeds.length, selectedFeedId });
      setMessage(`${importedFeeds.length} feed${importedFeeds.length === 1 ? "" : "s"} ready to import. Click yes to grant access and load them.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import OPML.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function exportOpml() {
    const blob = new Blob([serializeOpmlFeeds(settings.feeds)], { type: "text/x-opml+xml" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `snaptab-rss-feeds-${new Date().toISOString().slice(0, 10)}.opml`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setMessage("OPML exported.");
  }

  async function checkFeeds(feeds: RssFeed[], nextFeeds = rssWidget.settings.feeds, settingsAfterCheck: Partial<RssWidgetSettings> = {}) {
    if (feeds.length === 0) {
      setMessage("No feeds to check.");
      return;
    }

    const permissions = await requestPermissionsForUrls(feeds.map((feed) => feed.url));
    if (permissions.denied > 0 && permissions.granted === 0) {
      setMessage("Feed access was not granted.");
      setFeedStatuses((current) => ({
        ...current,
        ...Object.fromEntries(feeds.map((feed) => [feed.id, { state: "error", message: "Permission denied" } satisfies FeedCheckStatus]))
      }));
      return;
    }

    setMessage(`Checking ${feeds.length} feed${feeds.length === 1 ? "" : "s"}...`);

    setFeedStatuses((current) => ({
      ...current,
      ...Object.fromEntries(feeds.map((feed) => [feed.id, { state: "checking", message: "Checking..." } satisfies FeedCheckStatus]))
    }));

    const results = await Promise.all(feeds.map(async (feed) => ({ feed, result: await checkRssFeed(feed) })));
    setFeedStatuses((current) => ({
      ...current,
      ...Object.fromEntries(
        results.map(({ feed, result }) => [
          feed.id,
          result.ok
            ? ({ state: "ok", message: "Reachable" } satisfies FeedCheckStatus)
            : ({ state: "error", message: result.message } satisfies FeedCheckStatus)
        ])
      )
    }));
    // Re-fetch after checks complete so the widget reads the freshly populated cache.
    changeRssWidgetSettings({ ...settingsAfterCheck, feeds: [...nextFeeds] });
    setPendingFeedCheck(null);
    setMessage(`${results.filter(({ result }) => result.ok).length} of ${feeds.length} feed${feeds.length === 1 ? "" : "s"} reachable.`);
  }

  return (
    <>
      <header className="widget-context-header">
        <span>Widget</span>
        <strong>Snap Feed</strong>
      </header>
      <label className="context-toggle-row">
        <span>Enabled</span>
        <input checked={rssWidget.enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
      </label>

      <form className="rss-context-card" onSubmit={addFeed}>
        <label>
          <span>Feed URL</span>
          <input onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://example.com/feed.xml" type="url" value={feedUrl} />
        </label>
        <label>
          <span>Title</span>
          <input onChange={(event) => setFeedTitle(event.target.value)} placeholder="Optional" type="text" value={feedTitle} />
        </label>
        <button type="submit">Add feed</button>
        {message ? <p>{message}</p> : null}
      </form>

      {pendingFeedCheck ? (
        <div className="rss-context-permission-prompt" role="status">
          <strong>Check imported feeds?</strong>
          <span>{pendingFeedCheck.importedCount} feed{pendingFeedCheck.importedCount === 1 ? "" : "s"} will be imported. This will ask for feed access, verify all feeds, and show articles in the widget.</span>
          <button
            onClick={() => void checkFeeds(pendingFeedCheck.feeds, pendingFeedCheck.feeds, { selectedFeedId: pendingFeedCheck.selectedFeedId })}
            type="button"
          >
            Yes, check feeds
          </button>
        </div>
      ) : null}

      {settings.feeds.length > 0 ? (
        <div className="rss-context-feed-list" aria-label="RSS feeds">
          {settings.feeds.map((feed) => (
            <div className={`rss-context-feed rss-context-feed-${feedStatuses[feed.id]?.state ?? "unknown"}`} key={feed.id}>
              <span>{feed.title}</span>
              <small title={feedStatuses[feed.id]?.message}>{feedStatuses[feed.id]?.message ?? "Not checked"}</small>
              <button onClick={() => removeFeed(feed.id)} type="button">Remove</button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rss-context-actions">
        <button onClick={() => {
          importModeRef.current = "merge";
          importInputRef.current?.click();
        }} type="button">Import OPML</button>
        <button disabled={settings.feeds.length === 0} onClick={exportOpml} type="button">Export OPML</button>
        <button onClick={() => {
          importModeRef.current = "replace";
          importInputRef.current?.click();
        }} type="button">Replace OPML</button>
        <button disabled={settings.feeds.length === 0} onClick={() => checkFeeds(settings.feeds)} type="button">Check feeds</button>
        <input
          accept=".opml,.xml,text/xml,application/xml"
          className="rss-context-file-input"
          onChange={(event) => importOpml(event.target.files?.[0] ?? null, importModeRef.current)}
          ref={importInputRef}
          type="file"
        />
      </div>

      <label>
        <span>Feed view</span>
        <select value={settings.feedMode} onChange={(event) => changeRssWidgetSetting("feedMode", event.target.value as RssFeedMode)}>
          <option value="all">All feeds</option>
          <option value="selected">Selected feed</option>
        </select>
      </label>

      {settings.feedMode === "selected" ? (
        <label>
          <span>Selected feed</span>
          <select
            value={settings.selectedFeedId ?? ""}
            onChange={(event) => changeRssWidgetSetting("selectedFeedId", event.target.value || null)}
          >
            <option value="">Choose feed</option>
            {settings.feeds.map((feed) => <option key={feed.id} value={feed.id}>{feed.title}</option>)}
          </select>
        </label>
      ) : null}

      <label>
        <span>Display</span>
        <select value={settings.displayMode} onChange={(event) => changeRssWidgetSetting("displayMode", event.target.value as RssDisplayMode)}>
          <option value="compact">Compact</option>
          <option value="standard">Standard</option>
          <option value="expanded">Expanded</option>
        </select>
      </label>

      <RangeRow label="Items" max={20} min={1} onChange={(value) => changeRssWidgetSetting("maxItems", value)} suffix="" value={settings.maxItems} />
      {settings.feedMode === "all" ? (
        <RangeRow
          label="Items per feed"
          max={10}
          min={1}
          onChange={(value) => changeRssWidgetSetting("maxItemsPerFeed", value)}
          suffix=""
          value={settings.maxItemsPerFeed}
        />
      ) : null}
      <RangeRow label="Refresh" max={240} min={5} onChange={(value) => changeRssWidgetSetting("refreshMinutes", value)} suffix=" min" value={settings.refreshMinutes} />
      <WidgetVisualControls visual={settings.visual} onChange={(visual) => changeRssWidgetSetting("visual", visual)} />

      <label className="context-toggle-row">
        <span>Show source</span>
        <input checked={settings.showSource} onChange={(event) => changeRssWidgetSetting("showSource", event.target.checked)} type="checkbox" />
      </label>
      <label className="context-toggle-row">
        <span>Show snippets</span>
        <input checked={settings.showSnippet} onChange={(event) => changeRssWidgetSetting("showSnippet", event.target.checked)} type="checkbox" />
      </label>
    </>
  );
}

function mergeFeeds(currentFeeds: RssWidgetSettings["feeds"], importedFeeds: RssWidgetSettings["feeds"]) {
  const seenUrls = new Set(currentFeeds.map((feed) => normalizeFeedUrl(feed.url)).filter(Boolean));
  return [
    ...currentFeeds,
    ...importedFeeds.filter((feed) => {
      const url = normalizeFeedUrl(feed.url);
      if (!url || seenUrls.has(url)) {
        return false;
      }

      seenUrls.add(url);
      return true;
    })
  ];
}

function getFeedTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "RSS Feed";
  }
}
