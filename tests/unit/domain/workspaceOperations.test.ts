import { describe, expect, it } from "vitest";
import { moveWorkspaceItem, setWorkspaceItemPlacement } from "../../../src/domain/workspaceOperations";
import { workspaceTileItemId, workspaceWidgetItemId, type WorkspaceLayout } from "../../../src/domain/workspace";

const docs = workspaceTileItemId("docs");
const mail = workspaceTileItemId("mail");
const weather = workspaceWidgetItemId("weather");

const layout: WorkspaceLayout = {
  schemaVersion: 1,
  pages: [
    { id: "home", itemIds: [docs, weather] },
    { id: "work", itemIds: [mail] }
  ],
  placements: {
    [weather]: { column: 1, row: 1, columnSpan: 2, rowSpan: 1, zIndex: 2 }
  }
};

describe("workspace operations", () => {
  it("moves any item between pages at a bounded insertion index", () => {
    const moved = moveWorkspaceItem(layout, weather, { pageId: "work", index: 0 });

    expect(moved.pages).toEqual([
      { id: "home", itemIds: [docs] },
      { id: "work", itemIds: [weather, mail] }
    ]);
    expect(moved.placements[weather]).toEqual(layout.placements[weather]);
    expect(layout.pages[0].itemIds).toEqual([docs, weather]);
  });

  it("reorders an item within its current page after removing its old position", () => {
    const source: WorkspaceLayout = {
      ...layout,
      pages: [{ id: "home", itemIds: [docs, weather, mail] }]
    };

    expect(moveWorkspaceItem(source, docs, { pageId: "home", index: 2 }).pages[0].itemIds)
      .toEqual([weather, mail, docs]);
  });

  it("does not change the layout for stale item or page targets", () => {
    expect(moveWorkspaceItem(layout, workspaceTileItemId("missing"), { pageId: "work" })).toBe(layout);
    expect(moveWorkspaceItem(layout, docs, { pageId: "missing" })).toBe(layout);
  });

  it("updates placement without mutating membership and clamps invalid geometry", () => {
    const moved = setWorkspaceItemPlacement(layout, weather, {
      column: -2,
      row: 1.8,
      columnSpan: 0,
      rowSpan: 2.9,
      zIndex: 4.7
    });

    expect(moved.placements[weather]).toEqual({
      column: 0,
      row: 1,
      columnSpan: 1,
      rowSpan: 2,
      zIndex: 4
    });
    expect(moved.pages).toEqual(layout.pages);
    expect(layout.placements[weather]).toEqual({ column: 1, row: 1, columnSpan: 2, rowSpan: 1, zIndex: 2 });
  });

  it("ignores placement updates for items not on a workspace page", () => {
    expect(setWorkspaceItemPlacement(layout, workspaceTileItemId("missing"), {
      column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1
    })).toBe(layout);
  });
});
