import { describe, expect, it } from "vitest";
import {
  clampWorkspacePlacement,
  findWorkspacePlacement,
  workspacePlacementsOverlap
} from "../../../src/domain/workspaceLayout";
import type { WorkspaceItemId, WorkspaceLayout } from "../../../src/domain/workspace";

const widgetA = "widget:search" as WorkspaceItemId;
const widgetB = "widget:weather" as WorkspaceItemId;
const tileA = "tile:docs" as WorkspaceItemId;

function layout(): WorkspaceLayout {
  return {
    schemaVersion: 1,
    pages: [{ id: "page-1", itemIds: [widgetA, widgetB, tileA] }],
    placements: {
      [widgetA]: { column: 0, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 },
      [widgetB]: { column: 2, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 },
      [tileA]: { column: 4, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 }
    }
  };
}

describe("workspaceLayout", () => {
  it("clamps geometry to page bounds and normalizes invalid numbers", () => {
    expect(clampWorkspacePlacement(
      { column: 99, row: -4, columnSpan: 99, rowSpan: 0, zIndex: Number.NaN },
      { columns: 6, rows: 4 }
    )).toEqual({ column: 0, row: 0, columnSpan: 6, rowSpan: 1, zIndex: 1 });
  });

  it("detects overlapping rectangles but allows edge-touching rectangles", () => {
    expect(workspacePlacementsOverlap(
      { column: 0, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 },
      { column: 1, row: 1, columnSpan: 2, rowSpan: 2, zIndex: 1 }
    )).toBe(true);
    expect(workspacePlacementsOverlap(
      { column: 0, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 },
      { column: 2, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 }
    )).toBe(false);
  });

  it("keeps a requested free position and moves a colliding item to the first free cell", () => {
    const state = layout();
    expect(findWorkspacePlacement(state, "page-1", tileA, state.placements[tileA]!, { columns: 6, rows: 4 }))
      .toEqual(state.placements[tileA]);
    expect(findWorkspacePlacement(state, "page-1", tileA, {
      column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1
    }, { columns: 6, rows: 4 })).toEqual({
      column: 4, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1
    });
  });

  it("returns null for a missing page/item or a full page", () => {
    const state = layout();
    expect(findWorkspacePlacement(state, "missing", tileA, state.placements[tileA]!, { columns: 6, rows: 4 })).toBeNull();
    expect(findWorkspacePlacement(state, "page-1", "tile:missing" as WorkspaceItemId, state.placements[tileA]!, { columns: 6, rows: 4 })).toBeNull();
    const full: WorkspaceLayout = {
      schemaVersion: 1,
      pages: [{ id: "full", itemIds: [widgetA, widgetB] }],
      placements: {
        [widgetA]: { column: 0, row: 0, columnSpan: 3, rowSpan: 2, zIndex: 1 },
        [widgetB]: { column: 3, row: 0, columnSpan: 3, rowSpan: 2, zIndex: 1 }
      }
    };
    expect(findWorkspacePlacement(full, "full", widgetA, {
      column: 0, row: 0, columnSpan: 3, rowSpan: 2, zIndex: 1
    }, { columns: 6, rows: 2 })).toBeNull();
  });
});
