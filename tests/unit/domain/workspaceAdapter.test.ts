import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import {
  tabStateToWorkspaceLayout,
  workspaceLayoutToTabState
} from "../../../src/domain/workspaceAdapter";
import { workspaceTileItemId, workspaceWidgetItemId } from "../../../src/domain/workspace";

describe("tabStateToWorkspaceLayout", () => {
  it("preserves legacy shortcut page order and places widgets on the first workspace page", () => {
    const state = {
      ...defaultTabState,
      tiles: {
        docs: defaultTabState.tiles.docs,
        mail: defaultTabState.tiles.mail,
        "work-folder": defaultTabState.tiles["work-folder"]
      },
      pages: [
        { id: "home", tileIds: ["docs", "work-folder"] },
        { id: "other", tileIds: ["mail"] }
      ]
    };

    const layout = tabStateToWorkspaceLayout(state);

    expect(layout.pages).toEqual([
      {
        id: "home",
        itemIds: [
          workspaceTileItemId("docs"),
          workspaceTileItemId("work-folder"),
          workspaceWidgetItemId("search"),
          workspaceWidgetItemId("weather"),
          workspaceWidgetItemId("dateTime"),
          workspaceWidgetItemId("rss")
        ]
      },
      { id: "other", itemIds: [workspaceTileItemId("mail")] }
    ]);
  });

  it("does not expose folder children as independent workspace items", () => {
    const layout = tabStateToWorkspaceLayout(defaultTabState);
    const allItemIds = layout.pages.flatMap((page) => page.itemIds);

    expect(allItemIds).toContain(workspaceTileItemId("work-folder"));
    expect(allItemIds).not.toContain(workspaceTileItemId("work-notion"));
    expect(allItemIds).not.toContain(workspaceTileItemId("work-reddit"));
  });

  it("maps legacy widget geometry without mutating the persisted state", () => {
    const state = structuredClone(defaultTabState);
    state.canvas.widgets.weather.placement = {
      x: 4,
      y: 3,
      width: 6,
      height: 2,
      zIndex: 11
    };
    const snapshot = structuredClone(state);

    const layout = tabStateToWorkspaceLayout(state);

    expect(layout.placements[workspaceWidgetItemId("weather")]).toEqual({
      column: 4,
      row: 3,
      columnSpan: 6,
      rowSpan: 2,
      zIndex: 11
    });
    expect(state).toEqual(snapshot);
  });

  it("keeps orphaned top-level shortcuts visible and excludes the legacy shortcut-grid widget", () => {
    const state = structuredClone(defaultTabState);
    state.pages = [{ id: "home", tileIds: [] }];

    const layout = tabStateToWorkspaceLayout(state);
    const allItemIds = layout.pages.flatMap((page) => page.itemIds);

    expect(allItemIds).toContain(workspaceTileItemId("docs"));
    expect(allItemIds).not.toContain(workspaceWidgetItemId("shortcutGrid"));
  });
});

describe("workspaceLayoutToTabState", () => {
  it("round-trips page membership and widget placements without changing tile records", () => {
    const state = structuredClone(defaultTabState);
    const layout = tabStateToWorkspaceLayout(state);
    layout.pages[0].itemIds = layout.pages[0].itemIds.filter(
      (id) => id !== workspaceTileItemId("docs")
    );
    layout.pages[1] = {
      id: "work",
      itemIds: [workspaceTileItemId("docs"), workspaceWidgetItemId("weather")]
    };
    layout.placements[workspaceWidgetItemId("weather")] = {
      column: 3,
      row: 2,
      columnSpan: 5,
      rowSpan: 4,
      zIndex: 12
    };
    const tileSnapshot = structuredClone(state.tiles);

    const result = workspaceLayoutToTabState(state, layout);

    expect(result.pages.map((page) => ({ id: page.id, tileIds: page.tileIds }))).toEqual([
      {
        id: "page-1",
        tileIds: state.pages[0].tileIds.filter((id) => id !== "docs")
      },
      { id: "work", tileIds: ["docs"] }
    ]);
    expect(result.canvas.widgets.weather.placement).toEqual({
      x: 3,
      y: 2,
      width: 5,
      height: 4,
      zIndex: 12
    });
    expect(result.tiles).toEqual(tileSnapshot);
    expect(state).toEqual(defaultTabState);
  });

  it("retains valid top-level tiles omitted by a partial layout", () => {
    const state = structuredClone(defaultTabState);
    const partialLayout = {
      schemaVersion: 1 as const,
      pages: [{ id: "only-page", itemIds: [workspaceTileItemId("docs")] }],
      placements: {}
    };

    const result = workspaceLayoutToTabState(state, partialLayout);
    const allTiles = result.pages.flatMap((page) => page.tileIds);

    expect(allTiles).toContain("docs");
    expect(allTiles).toContain("mail");
    expect(allTiles).toContain("work-folder");
    expect(allTiles).not.toContain("work-notion");
    expect(allTiles).not.toContain("work-reddit");
  });
});
