import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";
import { findWorkspacePlacement, type WorkspaceGridMetrics } from "./workspaceLayout";
import { setWorkspaceItemPlacement } from "./workspaceOperations";

/**
 * Moves a focused item by one or more grid cells without changing page membership.
 * Collision resolution is deterministic and the input layout remains immutable.
 */
export function moveWorkspaceItemByKeyboard(
  layout: WorkspaceLayout,
  pageId: string,
  itemId: WorkspaceItemId,
  columnDelta: number,
  rowDelta: number,
  metrics: WorkspaceGridMetrics
): WorkspaceLayout {
  const current: WorkspaceGridPlacement = layout.placements[itemId] ?? {
    column: 0,
    row: 0,
    columnSpan: 1,
    rowSpan: 1,
    zIndex: 1
  };
  const placement = findWorkspacePlacement(
    layout,
    pageId,
    itemId,
    {
      ...current,
      column: current.column + finiteDelta(columnDelta),
      row: current.row + finiteDelta(rowDelta)
    },
    metrics
  );

  return placement ? setWorkspaceItemPlacement(layout, itemId, placement) : layout;
}

function finiteDelta(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}
