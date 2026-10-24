import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import { resolveWorkspacePageItems } from "../../../src/domain/workspaceItemModel";
import { workspaceTileItemId, workspaceWidgetItemId } from "../../../src/domain/workspace";

describe("resolveWorkspacePageItems", () => {
  it("returns typed shortcuts, folders, and peer widgets in page order", () => {
    const state = {
      ...defaultTabState,
      tiles: {
        docs: defaultTabState.tiles.docs,
        "work-folder": defaultTabState.tiles["work-folder"]
      },
      pages: [{ id: "home", tileIds: ["docs", "work-folder"] }]
    };

    const layout = {
      schemaVersion: 1 as const,
      pages: [{
        id: "home",
        itemIds: [
          workspaceTileItemId("docs"),
          workspaceWidgetItemId("weather"),
          workspaceTileItemId("work-folder")
        ]
      }],
      placements: {}
    };

    const items = resolveWorkspacePageItems(state, "home", layout);

    expect(items.map((item) => item.kind)).toEqual(["shortcut", "widget", "folder"]);
    expect(items[0]).toMatchObject({ kind: "shortcut", tileId: "docs" });
    expect(items[1]).toMatchObject({ kind: "widget", widgetId: "weather", enabled: true });
    expect(items[2]).toMatchObject({ kind: "folder", tileId: "work-folder" });
  });

  it("uses deterministic grid placements when no explicit placement exists", () => {
    const state = {
      ...defaultTabState,
      tiles: {
        docs: defaultTabState.tiles.docs,
        mail: defaultTabState.tiles.mail
      },
      pages: [{ id: "home", tileIds: ["docs", "mail"] }]
    };
    const layout = {
      schemaVersion: 1 as const,
      pages: [{
        id: "home",
        itemIds: [workspaceTileItemId("docs"), workspaceTileItemId("mail")]
      }],
      placements: {}
    };

    const items = resolveWorkspacePageItems(state, "home", layout);

    expect(items[0].placement).toEqual({ column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 });
    expect(items[1].placement).toEqual({ column: 1, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 });
  });

  it("returns no items for unknown pages and skips stale tile references", () => {
    const state = { ...defaultTabState, tiles: {}, pages: [] };
    const layout = {
      schemaVersion: 1 as const,
      pages: [{ id: "home", itemIds: [workspaceTileItemId("missing"), workspaceWidgetItemId("shortcutGrid")] }],
      placements: {}
    };

    expect(resolveWorkspacePageItems(state, "unknown", layout)).toEqual([]);
    expect(resolveWorkspacePageItems(state, "home", layout)).toEqual([]);
  });
});
