import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import { tabStateToWorkspaceLayout } from "../../../src/domain/workspaceAdapter";
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
