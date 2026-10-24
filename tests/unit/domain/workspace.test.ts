import { describe, expect, it } from "vitest";
import {
  normalizeWorkspaceLayout,
  workspaceTileItemId,
  workspaceWidgetItemId,
  type WorkspaceItemId
} from "../../../src/domain/workspace";

const knownItems = new Set<WorkspaceItemId>([
  workspaceWidgetItemId("search"),
  workspaceWidgetItemId("weather"),
  workspaceTileItemId("docs"),
  workspaceTileItemId("work-folder")
]);

describe("workspace layout contract", () => {
  it("uses namespaced stable IDs for widgets and tiles", () => {
    expect(workspaceWidgetItemId("search")).toBe("widget:search");
    expect(workspaceTileItemId("search")).toBe("tile:search");
  });

  it("normalizes duplicate pages, stale IDs, and duplicate item membership", () => {
    const source = {
      schemaVersion: 1 as const,
      pages: [
        { id: "page-1", itemIds: [workspaceTileItemId("docs"), workspaceWidgetItemId("search"), "tile:missing" as WorkspaceItemId] },
        { id: "page-1", itemIds: [workspaceTileItemId("docs"), workspaceWidgetItemId("weather")] }
      ],
      placements: {}
    };

    const normalized = normalizeWorkspaceLayout(source, knownItems);

    expect(normalized.pages).toEqual([
      { id: "page-1", itemIds: [workspaceTileItemId("docs"), workspaceWidgetItemId("search")] },
      { id: "page-1-2", itemIds: [workspaceWidgetItemId("weather")] }
    ]);
  });

  it("clamps invalid placement dimensions and ignores unknown placement IDs", () => {
    const normalized = normalizeWorkspaceLayout(
      {
        pages: [{ id: "page-1", itemIds: [workspaceWidgetItemId("search")] }],
        placements: {
          [workspaceWidgetItemId("search")]: {
            column: -2,
            row: 1.9,
            columnSpan: 0,
            rowSpan: 2.8,
            zIndex: 4.7
          },
          "widget:unknown": { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 }
        }
      },
      knownItems
    );

    expect(normalized.placements[workspaceWidgetItemId("search")]).toEqual({
      column: 0,
      row: 1,
      columnSpan: 1,
      rowSpan: 2,
      zIndex: 4
    });
    expect(normalized.placements["widget:unknown" as WorkspaceItemId]).toBeUndefined();
  });

  it("creates a default empty page when persisted pages are missing", () => {
    expect(normalizeWorkspaceLayout(null, knownItems)).toEqual({
      schemaVersion: 1,
      pages: [{ id: "page-1", itemIds: [] }],
      placements: {}
    });
  });

  it("does not mutate the persisted input", () => {
    const source = {
      pages: [{ id: "page-1", itemIds: [workspaceTileItemId("docs")] }],
      placements: {}
    };
    const snapshot = structuredClone(source);

    normalizeWorkspaceLayout(source, knownItems);

    expect(source).toEqual(snapshot);
  });
});
