import { describe, expect, it } from "vitest";
import {
  beginWorkspaceDrag,
  cancelWorkspaceDrag,
  commitWorkspaceDrag,
  updateWorkspaceDragTarget
} from "../../../src/domain/workspaceDrag";
import { workspaceTileItemId, workspaceWidgetItemId, type WorkspaceLayout } from "../../../src/domain/workspace";

const docs = workspaceTileItemId("docs");
const weather = workspaceWidgetItemId("weather");
const layout: WorkspaceLayout = {
  schemaVersion: 1,
  pages: [
    { id: "home", itemIds: [docs] },
    { id: "work", itemIds: [weather] }
  ],
  placements: {
    [docs]: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 },
    [weather]: { column: 2, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 3 }
  }
};

describe("workspace drag session", () => {
  it("starts a drag for any page item with its original geometry", () => {
    expect(beginWorkspaceDrag(layout, weather)).toMatchObject({
      itemId: weather,
      sourcePageId: "work",
      targetPageId: "work",
      sourcePlacement: { column: 2, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 3 },
      active: true
    });
  });

  it("returns null for stale drag sources", () => {
    expect(beginWorkspaceDrag(layout, workspaceTileItemId("missing"))).toBeNull();
  });

  it("cancels without changing the source geometry", () => {
    const session = beginWorkspaceDrag(layout, docs)!;
    const preview = updateWorkspaceDragTarget(session, "work", 0, {
      column: 3, row: 2, columnSpan: 2, rowSpan: 1, zIndex: 5
    });
    const cancelled = cancelWorkspaceDrag(preview);

    expect(cancelled.active).toBe(false);
    expect(cancelled.previewPlacement).toEqual(session.sourcePlacement);
    expect(commitWorkspaceDrag(layout, cancelled)).toBe(layout);
  });

  it("inserts before a same-page drop target after removing the source item", () => {
    const threeItemLayout: WorkspaceLayout = {
      ...layout,
      pages: [
        { id: "home", itemIds: [docs, workspaceTileItemId("mail"), workspaceTileItemId("notes")] },
        { id: "work", itemIds: [weather] }
      ]
    };
    const session = beginWorkspaceDrag(threeItemLayout, docs)!;
    const target = updateWorkspaceDragTarget(session, "home", 2, {
      column: 4, row: 2, columnSpan: 1, rowSpan: 1, zIndex: 1
    });

    expect(commitWorkspaceDrag(threeItemLayout, target).pages[0].itemIds).toEqual([
      workspaceTileItemId("mail"), docs, workspaceTileItemId("notes")
    ]);
  });

  it("commits a cross-page move and its preview placement", () => {
    const session = beginWorkspaceDrag(layout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 1, row: 2, columnSpan: 2, rowSpan: 1, zIndex: 4
    });
    const committed = commitWorkspaceDrag(layout, target);

    expect(committed.pages).toEqual([
      { id: "home", itemIds: [] },
      { id: "work", itemIds: [docs, weather] }
    ]);
    expect(committed.placements[docs]).toEqual({
      column: 1, row: 2, columnSpan: 2, rowSpan: 1, zIndex: 4
    });
    expect(layout.pages[0].itemIds).toEqual([docs]);
  });
  it("resolves a colliding preview to the first free destination cell when metrics are supplied", () => {
    const session = beginWorkspaceDrag(layout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 2, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 4
    });
    const committed = commitWorkspaceDrag(layout, target, { columns: 6, rows: 4 });

    expect(committed.pages[1].itemIds).toEqual([docs, weather]);
    expect(committed.placements[docs]).toEqual({
      column: 0, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 4
    });
  });

  it("keeps the original layout when the destination has no free placement", () => {
    const fullLayout: WorkspaceLayout = {
      schemaVersion: 1,
      pages: [
        { id: "home", itemIds: [docs] },
        { id: "work", itemIds: [weather, workspaceTileItemId("tile-b")] }
      ],
      placements: {
        [docs]: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 },
        [weather]: { column: 0, row: 0, columnSpan: 3, rowSpan: 1, zIndex: 1 },
        [workspaceTileItemId("tile-b")]: { column: 3, row: 0, columnSpan: 3, rowSpan: 1, zIndex: 1 }
      }
    };
    const session = beginWorkspaceDrag(fullLayout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 2
    });

    expect(commitWorkspaceDrag(fullLayout, target, { columns: 6, rows: 1 })).toBe(fullLayout);
  });
  it("does not overwrite a concurrent reorder on the source page", () => {
    const multiItemLayout: WorkspaceLayout = {
      ...layout,
      pages: [
        { id: "home", itemIds: [docs, workspaceTileItemId("other")] },
        { id: "work", itemIds: [weather] }
      ]
    };
    const session = beginWorkspaceDrag(multiItemLayout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 4, row: 2, columnSpan: 1, rowSpan: 1, zIndex: 5
    });
    const concurrentlyReordered: WorkspaceLayout = {
      ...multiItemLayout,
      pages: [
        { id: "home", itemIds: [workspaceTileItemId("other"), docs] },
        { id: "work", itemIds: [weather] }
      ]
    };

    expect(commitWorkspaceDrag(concurrentlyReordered, target)).toBe(concurrentlyReordered);
  });

  it("does not overwrite a concurrent placement change on the source page", () => {
    const session = beginWorkspaceDrag(layout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 4, row: 2, columnSpan: 1, rowSpan: 1, zIndex: 5
    });
    const concurrentlyResized: WorkspaceLayout = {
      ...layout,
      placements: {
        ...layout.placements,
        [docs]: { column: 1, row: 0, columnSpan: 2, rowSpan: 1, zIndex: 1 }
      }
    };

    expect(commitWorkspaceDrag(concurrentlyResized, target)).toBe(concurrentlyResized);
  });

  it("does not commit a stale drag after the item was moved concurrently", () => {
    const session = beginWorkspaceDrag(layout, docs)!;
    const target = updateWorkspaceDragTarget(session, "work", 0, {
      column: 1, row: 2, columnSpan: 1, rowSpan: 1, zIndex: 4
    });
    const concurrentlyMoved: WorkspaceLayout = {
      ...layout,
      pages: [
        { id: "home", itemIds: [] },
        { id: "work", itemIds: [docs, weather] }
      ]
    };

    expect(commitWorkspaceDrag(concurrentlyMoved, target)).toBe(concurrentlyMoved);
  });


});
