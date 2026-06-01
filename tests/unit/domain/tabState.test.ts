import { describe, expect, it } from "vitest";
import { buildSearchUrl, defaultTabState, migrateLegacyTabState, normalizeTabState } from "../../../src/domain/tabState";

const baseLegacyState = {
  schemaVersion: 1 as const,
  searchProvider: defaultTabState.searchProvider,
  layout: defaultTabState.layout,
  wallpaper: defaultTabState.wallpaper
};

describe("migrateLegacyTabState", () => {
  it("returns the v2 default for empty state", () => {
    const migrated = migrateLegacyTabState(null);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.pages[0].tileIds).toContain("docs");
    expect(migrated.tiles["work-folder"].kind).toBe("folder");
  });

  it("migrates shortcuts-only v1 state into tiles and page ids", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [
        {
          id: "docs",
          title: "Docs",
          url: "https://docs.google.com",
          icon: {
            type: "fallback",
            label: "D",
            background: "#4285f4"
          }
        }
      ],
      folders: []
    });

    expect(migrated.pages).toEqual([{ id: "page-1", tileIds: ["docs"] }]);
    expect(migrated.tiles.docs.kind).toBe("shortcut");
  });

  it("migrates folders with children into a flat tile map", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [],
      folders: [
        {
          id: "work-folder",
          title: "Work",
          icon: {
            type: "fallback",
            label: "W",
            background: "#64748b"
          },
          quickLinks: [
            {
              id: "work-notion",
              title: "Notion",
              url: "https://notion.so",
              icon: {
                type: "fallback",
                label: "N",
                background: "#111827"
              }
            },
            {
              id: "work-reddit",
              title: "Reddit",
              url: "https://reddit.com",
              icon: {
                type: "fallback",
                label: "R",
                background: "#ff4500"
              }
            }
          ]
        }
      ]
    });

    expect(migrated.pages[0].tileIds).toEqual(["work-folder"]);
    expect(migrated.tiles["work-folder"].kind === "folder" ? migrated.tiles["work-folder"].childIds : []).toEqual([
      "work-notion",
      "work-reddit"
    ]);
    expect(migrated.tiles["work-notion"].kind).toBe("shortcut");
  });

  it("preserves mixed explicit top-level order", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [
        {
          id: "docs",
          title: "Docs",
          url: "https://docs.google.com",
          icon: {
            type: "fallback",
            label: "D",
            background: "#4285f4"
          }
        }
      ],
      folders: [
        {
          id: "work-folder",
          title: "Work",
          icon: {
            type: "fallback",
            label: "W",
            background: "#64748b"
          },
          quickLinks: [
            {
              id: "work-notion",
              title: "Notion",
              url: "https://notion.so",
              icon: {
                type: "fallback",
                label: "N",
                background: "#111827"
              }
            }
          ]
        }
      ],
      topLevelTiles: [
        { type: "folder", id: "work-folder" },
        { type: "shortcut", id: "docs" }
      ]
    });

    expect(migrated.pages[0].tileIds).toEqual(["docs", "work-notion"]);
    expect(migrated.tiles["work-folder"]).toBeUndefined();
  });
});

describe("normalizeTabState", () => {
  it("filters invalid folder children and dissolves folders with fewer than two valid shortcuts", () => {
    const normalized = normalizeTabState({
      ...defaultTabState,
      tiles: {
        one: shortcut("one"),
        two: shortcut("two"),
        missingOnly: folder("missingOnly", ["missing"]),
        mixed: folder("mixed", ["one", "missing", "one", "missingOnly"]),
        valid: folder("valid", ["one", "two", "missing"])
      },
      pages: [{ id: "page-1", tileIds: ["missingOnly", "mixed", "valid"] }]
    });

    expect(normalized.tiles.missingOnly).toBeUndefined();
    expect(normalized.tiles.mixed).toBeUndefined();
    expect(normalized.tiles.valid.kind === "folder" ? normalized.tiles.valid.childIds : []).toEqual(["one", "two"]);
    expect(normalized.pages[0].tileIds).toEqual(["valid"]);
  });

  it("normalizes duplicate page ids", () => {
    const normalized = normalizeTabState({
      ...defaultTabState,
      tiles: {
        one: shortcut("one"),
        two: shortcut("two")
      },
      pages: [
        { id: "page-1", tileIds: ["one"] },
        { id: "page-1", tileIds: ["two"] }
      ]
    });

    expect(normalized.pages.map((page) => page.id)).toEqual(["page-1", "page-2"]);
  });

  it("normalizes persisted global themes", () => {
    expect(normalizeTabState({ ...defaultTabState, themeId: "neon" }).themeId).toBe("neon");
    expect(normalizeTabState({ ...defaultTabState, themeId: "unknown" }).themeId).toBe("dark");
  });

  it("normalizes Search Widget height to one Canvas unit", () => {
    const normalized = normalizeTabState({
      ...defaultTabState,
      canvas: {
        ...defaultTabState.canvas,
        widgets: {
          ...defaultTabState.canvas.widgets,
          search: {
            ...defaultTabState.canvas.widgets.search,
            placement: {
              ...defaultTabState.canvas.widgets.search.placement,
              height: 4
            }
          }
        }
      }
    });

    expect(normalized.canvas.widgets.search.placement.height).toBe(1);
  });

  it("normalizes invalid Search Widget verticals", () => {
    const normalized = normalizeTabState({
      ...defaultTabState,
      canvas: {
        ...defaultTabState.canvas,
        widgets: {
          ...defaultTabState.canvas.widgets,
          search: {
            ...defaultTabState.canvas.widgets.search,
            settings: {
              ...defaultTabState.canvas.widgets.search.settings,
              searchVertical: "shopping"
            }
          }
        }
      }
    });

    expect(normalized.canvas.widgets.search.settings.searchVertical).toBe("web");
  });
});

describe("buildSearchUrl", () => {
  it("builds provider-specific vertical search URLs", () => {
    expect(buildSearchUrl("google", "images", "red panda")).toBe("https://www.google.com/search?tbm=isch&q=red%20panda");
    expect(buildSearchUrl("yahoo", "news", "market open")).toBe("https://news.search.yahoo.com/search?p=market%20open");
    expect(buildSearchUrl("duckduckgo", "maps", "coffee near me")).toBe(
      "https://duckduckgo.com/?iaxm=maps&ia=maps&q=coffee%20near%20me"
    );
  });
});

function shortcut(id: string) {
  return {
    kind: "shortcut" as const,
    id,
    title: id,
    url: `https://${id}.example.com`,
    icon: {
      type: "fallback" as const,
      label: id.slice(0, 1).toUpperCase(),
      background: "#111827"
    }
  };
}

function folder(id: string, childIds: string[]) {
  return {
    kind: "folder" as const,
    id,
    title: id,
    icon: {
      type: "fallback" as const,
      label: "F",
      background: "#64748b"
    },
    childIds
  };
}
