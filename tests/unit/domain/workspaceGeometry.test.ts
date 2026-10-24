import { describe, expect, it } from "vitest";
import { normalizeWorkspacePageGeometry } from "../../../src/domain/workspaceGeometry";
import { workspaceTileItemId, workspaceWidgetItemId, type WorkspaceLayout } from "../../../src/domain/workspace";

const search = workspaceWidgetItemId("search");
const weather = workspaceWidgetItemId("weather");
const docs = workspaceTileItemId("docs");

describe("normalizeWorkspacePageGeometry", () => {
  it("clamps bounds and resolves collisions deterministically in page order", () => {
    const layout: WorkspaceLayout = {
      schemaVersion: 1,
      pages: [{ id: "home", itemIds: [search, weather, docs] }],
      placements: {
        [search]: { column: 0, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 1 },
        [weather]: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 },
        [docs]: { column: 99, row: 99, columnSpan: 1, rowSpan: 1, zIndex: 1 }
      }
    };

    const result = normalizeWorkspacePageGeometry(layout, "home", { columns: 4, rows: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.layout.placements[search]).toEqual({
      column: 0, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 1
    });
    expect(result.layout.placements[weather]).toEqual({
      column: 2, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1
    });
    expect(result.layout.placements[docs]).toEqual({
      column: 3, row: 1, columnSpan: 1, rowSpan: 1, zIndex: 1
    });
    expect(layout.placements[weather]?.column).toBe(0);
  });

  it("returns the original layout atomically when items cannot fit", () => {
    const layout: WorkspaceLayout = {
      schemaVersion: 1,
      pages: [{ id: "full", itemIds: [search, weather] }],
      placements: {
        [search]: { column: 0, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 1 },
        [weather]: { column: 0, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 1 }
      }
    };

    const result = normalizeWorkspacePageGeometry(layout, "full", { columns: 2, rows: 1 });
    expect(result).toEqual({ ok: false, reason: "page-overflow", layout });
  });

  it("does not change anything when the page is missing", () => {
    const layout: WorkspaceLayout = {
      schemaVersion: 1,
      pages: [{ id: "home", itemIds: [docs] }],
      placements: {}
    };
    expect(normalizeWorkspacePageGeometry(layout, "missing", { columns: 4, rows: 2 }))
      .toEqual({ ok: false, reason: "missing-page", layout });
  });
});
