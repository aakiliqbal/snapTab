import { describe, expect, it } from "vitest";
import { workspaceTileItemId, workspaceWidgetItemId, type WorkspaceLayout } from "../../../src/domain/workspace";
import { moveWorkspaceItemByKeyboard } from "../../../src/domain/workspaceKeyboard";

const docs = workspaceTileItemId("docs");
const weather = workspaceWidgetItemId("weather");
const layout: WorkspaceLayout = {
  schemaVersion: 1,
  pages: [{ id: "home", itemIds: [docs, weather] }],
  placements: {
    [docs]: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 },
    [weather]: { column: 1, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 }
  }
};

describe("moveWorkspaceItemByKeyboard", () => {
  it("moves an item by the requested grid delta", () => {
    const moved = moveWorkspaceItemByKeyboard(layout, "home", docs, 0, 1, { columns: 4, rows: 3 });
    expect(moved.placements[docs]).toEqual({
      column: 0, row: 1, columnSpan: 1, rowSpan: 1, zIndex: 1
    });
    expect(layout.placements[docs]?.row).toBe(0);
  });

  it("uses deterministic collision resolution when the requested cell is occupied", () => {
    const moved = moveWorkspaceItemByKeyboard(layout, "home", docs, 1, 0, { columns: 4, rows: 3 });
    expect(moved.placements[docs]).not.toEqual(layout.placements[weather]);
    expect(moved.placements[docs]).toEqual({
      column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1
    });
  });

  it("leaves layout unchanged for an item that is not on the requested page", () => {
    expect(moveWorkspaceItemByKeyboard(layout, "missing", docs, 1, 0, { columns: 4, rows: 3 })).toBe(layout);
  });
});
