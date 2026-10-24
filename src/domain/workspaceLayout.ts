import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";

export type WorkspaceGridMetrics = {
  columns: number;
  rows: number;
};

/** Clamp a workspace item's grid rectangle to the visible page bounds. */
export function clampWorkspacePlacement(
  placement: WorkspaceGridPlacement,
  metrics: WorkspaceGridMetrics
): WorkspaceGridPlacement {
  const columns = positiveInteger(metrics.columns, 1);
  const rows = positiveInteger(metrics.rows, 1);
  const columnSpan = Math.min(columns, positiveInteger(placement.columnSpan, 1));
  const rowSpan = Math.min(rows, positiveInteger(placement.rowSpan, 1));

  return {
    column: Math.min(Math.max(0, finiteInteger(placement.column, 0)), columns - columnSpan),
    row: Math.min(Math.max(0, finiteInteger(placement.row, 0)), rows - rowSpan),
    columnSpan,
    rowSpan,
    zIndex: finiteInteger(placement.zIndex, 1)
  };
}

/** Rectangles overlap when they share at least one grid cell. */
export function workspacePlacementsOverlap(
  left: WorkspaceGridPlacement,
  right: WorkspaceGridPlacement
): boolean {
  return (
    left.column < right.column + right.columnSpan &&
    left.column + left.columnSpan > right.column &&
    left.row < right.row + right.rowSpan &&
    left.row + left.rowSpan > right.row
  );
}

/**
 * Finds the first non-overlapping position in row-major order. Existing items
 * are checked in page order, so behavior stays deterministic across tabs.
 */
export function findWorkspacePlacement(
  layout: WorkspaceLayout,
  pageId: string,
  itemId: WorkspaceItemId,
  requested: WorkspaceGridPlacement,
  metrics: WorkspaceGridMetrics
): WorkspaceGridPlacement | null {
  const page = layout.pages.find((candidate) => candidate.id === pageId);
  if (!page || !page.itemIds.includes(itemId)) {
    return null;
  }

  const candidate = clampWorkspacePlacement(requested, metrics);
  const occupied = page.itemIds
    .filter((otherId) => otherId !== itemId)
    .map((otherId) => layout.placements[otherId])
    .filter((placement): placement is WorkspaceGridPlacement => Boolean(placement))
    .map((placement) => clampWorkspacePlacement(placement, metrics));

  if (!occupied.some((placement) => workspacePlacementsOverlap(candidate, placement))) {
    return candidate;
  }

  const columns = positiveInteger(metrics.columns, 1);
  const rows = positiveInteger(metrics.rows, 1);
  for (let row = 0; row <= rows - candidate.rowSpan; row += 1) {
    for (let column = 0; column <= columns - candidate.columnSpan; column += 1) {
      const next = { ...candidate, column, row };
      if (!occupied.some((placement) => workspacePlacementsOverlap(next, placement))) {
        return next;
      }
    }
  }

  return null;
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

function finiteInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}
