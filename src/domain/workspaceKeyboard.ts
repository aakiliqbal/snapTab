import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";
import {
  clampWorkspacePlacement,
  workspacePlacementsOverlap,
  type WorkspaceGridMetrics
} from "./workspaceLayout";
import { setWorkspaceItemPlacement } from "./workspaceOperations";

/**
 * Moves a focused item by grid cells without changing page membership.
 * When the requested cell is occupied, chooses the nearest free cell rather
 * than accidentally returning the item's original cell.
 */
export function moveWorkspaceItemByKeyboard(
  layout: WorkspaceLayout,
  pageId: string,
  itemId: WorkspaceItemId,
  columnDelta: number,
  rowDelta: number,
  metrics: WorkspaceGridMetrics
): WorkspaceLayout {
  const page = layout.pages.find((candidate) => candidate.id === pageId);
  if (!page?.itemIds.includes(itemId)) return layout;

  const current: WorkspaceGridPlacement = layout.placements[itemId] ?? {
    column: 0,
    row: 0,
    columnSpan: 1,
    rowSpan: 1,
    zIndex: 1
  };
  const columns = Math.max(1, Math.floor(Number.isFinite(metrics.columns) ? metrics.columns : 1));
  const rows = Math.max(1, Math.floor(Number.isFinite(metrics.rows) ? metrics.rows : 1));
  const target = clampWorkspacePlacement({
    ...current,
    column: current.column + finiteDelta(columnDelta),
    row: current.row + finiteDelta(rowDelta)
  }, { columns, rows });
  if (target.column === current.column && target.row === current.row) return layout;

  const occupied = page.itemIds
    .filter((otherId) => otherId !== itemId)
    .map((otherId) => layout.placements[otherId])
    .filter((placement): placement is WorkspaceGridPlacement => Boolean(placement))
    .map((placement) => clampWorkspacePlacement(placement, { columns, rows }));

  if (!occupied.some((placement) => workspacePlacementsOverlap(target, placement))) {
    return setWorkspaceItemPlacement(layout, itemId, target);
  }

  const candidates: WorkspaceGridPlacement[] = [];
  for (let row = 0; row <= rows - target.rowSpan; row += 1) {
    for (let column = 0; column <= columns - target.columnSpan; column += 1) {
      const candidate = { ...target, column, row };
      if (column === current.column && row === current.row) continue;
      if (!occupied.some((placement) => workspacePlacementsOverlap(candidate, placement))) {
        candidates.push(candidate);
      }
    }
  }
  candidates.sort((left, right) => {
    const leftDistance = Math.abs(left.column - target.column) + Math.abs(left.row - target.row);
    const rightDistance = Math.abs(right.column - target.column) + Math.abs(right.row - target.row);
    return leftDistance - rightDistance || left.row - right.row || left.column - right.column;
  });
  return candidates[0] ? setWorkspaceItemPlacement(layout, itemId, candidates[0]) : layout;
}

function finiteDelta(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}
