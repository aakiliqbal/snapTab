import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";
import {
  clampWorkspacePlacement,
  workspacePlacementsOverlap,
  type WorkspaceGridMetrics
} from "./workspaceLayout";

export type WorkspaceGeometryResult =
  | { ok: true; layout: WorkspaceLayout }
  | { ok: false; reason: "missing-page" | "page-overflow"; layout: WorkspaceLayout };

/**
 * Resolves a page's placements to a bounded, collision-free grid in stable
 * membership order. The input is never mutated. If all items cannot fit, the
 * original layout is returned so callers can avoid partially applying geometry.
 */
export function normalizeWorkspacePageGeometry(
  layout: WorkspaceLayout,
  pageId: string,
  metrics: WorkspaceGridMetrics
): WorkspaceGeometryResult {
  const page = layout.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    return { ok: false, reason: "missing-page", layout };
  }

  const normalizedPlacements: Partial<Record<WorkspaceItemId, WorkspaceGridPlacement>> = {
    ...layout.placements
  };
  const occupied: WorkspaceGridPlacement[] = [];

  for (let index = 0; index < page.itemIds.length; index += 1) {
    const itemId = page.itemIds[index];
    const requested = layout.placements[itemId] ?? defaultPlacement(index);
    const candidate = clampWorkspacePlacement(requested, metrics);

    if (!occupied.some((placement) => workspacePlacementsOverlap(candidate, placement))) {
      normalizedPlacements[itemId] = candidate;
      occupied.push(candidate);
      continue;
    }

    const freePlacement = findFirstFreePlacement(candidate, occupied, metrics);
    if (!freePlacement) {
      return { ok: false, reason: "page-overflow", layout };
    }

    normalizedPlacements[itemId] = freePlacement;
    occupied.push(freePlacement);
  }

  return {
    ok: true,
    layout: { ...layout, placements: normalizedPlacements }
  };
}

function findFirstFreePlacement(
  base: WorkspaceGridPlacement,
  occupied: WorkspaceGridPlacement[],
  metrics: WorkspaceGridMetrics
): WorkspaceGridPlacement | null {
  const columns = Math.max(1, Math.floor(Number.isFinite(metrics.columns) ? metrics.columns : 1));
  const rows = Math.max(1, Math.floor(Number.isFinite(metrics.rows) ? metrics.rows : 1));
  for (let row = 0; row <= rows - base.rowSpan; row += 1) {
    for (let column = 0; column <= columns - base.columnSpan; column += 1) {
      const candidate = { ...base, column, row };
      if (!occupied.some((placement) => workspacePlacementsOverlap(candidate, placement))) {
        return candidate;
      }
    }
  }
  return null;
}

function defaultPlacement(index: number): WorkspaceGridPlacement {
  return {
    column: index % 6,
    row: Math.floor(index / 6),
    columnSpan: 1,
    rowSpan: 1,
    zIndex: 1
  };
}
