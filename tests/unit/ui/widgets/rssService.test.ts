// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultCanvasState } from "../../../../src/domain/canvas";
import { fetchRssItems } from "../../../../src/ui/widgets/rss/rssService";

describe("fetchRssItems", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("limits items per feed before applying the global item limit", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      return new Response(url.includes("feed-a") ? feedXml("A", 5, "2024-01-02") : feedXml("B", 2, "2024-01-01"), {
        status: 200,
        headers: { "Content-Type": "application/xml" }
      });
    });

    const result = await fetchRssItems({
      ...defaultCanvasState.widgets.rss.settings,
      feeds: [
        { id: "feed-a", title: "Feed A", url: "https://example.com/feed-a.xml" },
        { id: "feed-b", title: "Feed B", url: "https://example.com/feed-b.xml" }
      ],
      feedMode: "all",
      maxItems: 4,
      maxItemsPerFeed: 2
    });

    expect(result.items.map((item) => item.feedId)).toEqual(["feed-a", "feed-a", "feed-b", "feed-b"]);
  });
});

function feedXml(prefix: string, count: number, day: string) {
  const items = Array.from({ length: count }, (_, index) => {
    const itemNumber = index + 1;
    return `
      <item>
        <title>${prefix} ${itemNumber}</title>
        <link>https://example.com/${prefix.toLowerCase()}/${itemNumber}</link>
        <pubDate>${day}T0${count - index}:00:00Z</pubDate>
        <guid>${prefix}-${itemNumber}</guid>
      </item>
    `;
  }).join("");

  return `<rss version="2.0"><channel><title>Feed ${prefix}</title>${items}</channel></rss>`;
}
