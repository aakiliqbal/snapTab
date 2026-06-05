// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseOpmlFeeds, parseRssXml, serializeOpmlFeeds } from "../../../src/domain/rss";
import type { RssFeed } from "../../../src/domain/canvas";

describe("OPML feeds", () => {
  it("parses RSS outlines and skips duplicate feed URLs", () => {
    const feeds = parseOpmlFeeds(`
      <opml version="2.0">
        <body>
          <outline text="Tech">
            <outline type="rss" title="Example News" xmlUrl="https://example.com/feed.xml" />
            <outline type="rss" text="Duplicate" xmlUrl="https://example.com/feed.xml#latest" />
            <outline text="No URL" />
          </outline>
          <outline type="rss" text="Atom Feed" xmlUrl="https://example.com/atom.xml" />
        </body>
      </opml>
    `);

    expect(feeds).toEqual([
      expect.objectContaining({ title: "Example News", url: "https://example.com/feed.xml" }),
      expect.objectContaining({ title: "Atom Feed", url: "https://example.com/atom.xml" })
    ]);
  });

  it("serializes feeds as importable OPML", () => {
    const feeds: RssFeed[] = [{ id: "rss-one", title: "A & B", url: "https://example.com/feed.xml" }];
    const opml = serializeOpmlFeeds(feeds);

    expect(opml).toContain('<opml version="2.0">');
    expect(opml).toContain('title="A &amp; B"');
    expect(parseOpmlFeeds(opml)).toEqual([expect.objectContaining({ title: "A & B", url: "https://example.com/feed.xml" })]);
  });

  it("parses Smart Launcher OPML 1.0 exports with nested text outlines", () => {
    const feeds = parseOpmlFeeds(`
      <?xml version="1.0" encoding="UTF-8"?>
      <opml version="1.0">
        <head><title>Your Feed List</title></head>
        <body>
          <outline text="RSS Feeds">
            <outline text="Android Developers Blog" type="rss" xmlUrl="https://feeds.feedburner.com/blogspot/hsDu"/>
            <outline text="Baeldung" type="rss" xmlUrl="https://feeds.feedblitz.com/baeldung&x=1"/>
            <outline text="It's FOSS" type="rss" xmlUrl="https://itsfoss.com/rss/"/>
          </outline>
        </body>
      </opml>
    `);

    expect(feeds).toEqual([
      expect.objectContaining({ title: "Android Developers Blog", url: "https://feeds.feedburner.com/blogspot/hsDu" }),
      expect.objectContaining({ title: "Baeldung", url: "https://feeds.feedblitz.com/baeldung&x=1" }),
      expect.objectContaining({ title: "It's FOSS", url: "https://itsfoss.com/rss/" })
    ]);
  });
});

describe("RSS XML parsing", () => {
  const feed: RssFeed = { id: "rss-example", title: "Example", url: "https://example.com/feed.xml" };

  it("parses RSS 2.0 items", () => {
    const parsed = parseRssXml(
      `
        <rss version="2.0">
          <channel>
            <title>Example News</title>
            <item>
              <title>First story</title>
              <link>https://example.com/first</link>
              <description><![CDATA[<p>First summary</p>]]></description>
              <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
              <author>editor@example.com</author>
              <guid>first-guid</guid>
            </item>
          </channel>
        </rss>
      `,
      feed
    );

    expect(parsed.title).toBe("Example News");
    expect(parsed.items[0]).toEqual(
      expect.objectContaining({
        feedId: "rss-example",
        feedTitle: "Example News",
        title: "First story",
        link: "https://example.com/first",
        snippet: "First summary",
        publishedAt: "2024-01-01T10:00:00.000Z",
        author: "editor@example.com"
      })
    );
  });

  it("extracts RSS item images from media, enclosure, and description HTML", () => {
    const parsed = parseRssXml(
      `
        <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel>
            <title>Image Feed</title>
            <item>
              <title>Media thumbnail story</title>
              <link>https://example.com/media</link>
              <media:thumbnail url="https://cdn.example.com/thumb.jpg" />
            </item>
            <item>
              <title>Enclosure story</title>
              <link>https://example.com/enclosure</link>
              <enclosure url="https://cdn.example.com/enclosure.jpg" type="image/jpeg" />
            </item>
            <item>
              <title>Description story</title>
              <link>https://example.com/posts/description</link>
              <description><![CDATA[<p>Story</p><img src="/images/description.jpg" />]]></description>
            </item>
          </channel>
        </rss>
      `,
      feed
    );

    expect(parsed.items.map((item) => item.imageUrl)).toEqual([
      "https://cdn.example.com/thumb.jpg",
      "https://cdn.example.com/enclosure.jpg",
      "https://example.com/images/description.jpg"
    ]);
  });

  it("parses Atom entries", () => {
    const parsed = parseRssXml(
      `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Example Atom</title>
          <entry>
            <id>tag:example.com,2024:second</id>
            <title>Second story</title>
            <link href="https://example.com/second" />
            <summary>Second summary</summary>
            <updated>2024-02-02T09:30:00Z</updated>
            <author><name>Ada</name></author>
          </entry>
        </feed>
      `,
      feed
    );

    expect(parsed.title).toBe("Example Atom");
    expect(parsed.items[0]).toEqual(
      expect.objectContaining({
        title: "Second story",
        link: "https://example.com/second",
        snippet: "Second summary",
        publishedAt: "2024-02-02T09:30:00.000Z",
        author: "Ada"
      })
    );
  });

  it("extracts Atom item images from content HTML", () => {
    const parsed = parseRssXml(
      `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Example Atom</title>
          <entry>
            <id>tag:example.com,2024:image</id>
            <title>Image story</title>
            <link href="https://example.com/posts/image" />
            <content type="html"><![CDATA[<p>Story</p><img src="https://cdn.example.com/atom.jpg" />]]></content>
          </entry>
        </feed>
      `,
      feed
    );

    expect(parsed.items[0].imageUrl).toBe("https://cdn.example.com/atom.jpg");
  });
});
