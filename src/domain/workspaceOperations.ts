import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";

export type WorkspaceMoveTarget = {
  pageId: string;
  /** Insert before this index; defaults to the end of the target page. */
  index?: number;
};

/**
 * Moves an item between or within pages without mutating the input layout.
 * Unknown items/pages are a no-op, making this safe for stale drag events.
 */
export function moveWorkspaceItem(
  layout: WorkspaceLayout,
  itemId: WorkspaceItemId,
  target: WorkspaceMoveTarget
): WorkspaceLayout {
  const sourcePageIndex = layout.pages.findIndex((page) => page.itemIds.includes(itemId));
  const targetPageIndex = layout.pages.findIndex((page) => page.id === target.pageId);
  if (sourcePageIndex < 0 || targetPageIndex < 0) {
    return layout;
  }

  const pages = layout.pages.map((page) => ({ ...page, itemIds: [...page.itemIds] }));
  const sourceItems = pages[sourcePageIndex].itemIds;
  const sourceIndex = sourceItems.indexOf(itemId);
  sourceItems.splice(sourceIndex, 1);

  const targetItems = pages[targetPageIndex].itemIds;
  const requestedIndex = target.index ?? targetItems.length;
  const insertionIndex = Math.max(0, Math.min(Math.floor(requestedIndex), targetItems.length));
  targetItems.splice(insertionIndex, 0, itemId);

  return { ...layout, pages };
}

/** Updates grid geometry for a known workspace item without changing membership. */
export function setWorkspaceItemPlacement(
  layout: WorkspaceLayout,
  itemId: WorkspaceItemId,
  placement: WorkspaceGridPlacement
): WorkspaceLayout {
  if (!layout.pages.some((page) => page.itemIds.includes(itemId))) {
    return layout;
  }

  const normalizedPlacement = {
    column: nonNegativeInteger(placement.column),
    row: nonNegativeInteger(placement.row),
    columnSpan: Math.max(1, nonNegativeInteger(placement.columnSpan)),
    rowSpan: Math.max(1, nonNegativeInteger(placement.rowSpan)),
    zIndex: Number.isFinite(placement.zIndex) ? Math.floor(placement.zIndex) : 1
  };

  return {
    ...layout,
    placements: {
      ...layout.placements,
      [itemId]: normalizedPlacement
    }
  };
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
