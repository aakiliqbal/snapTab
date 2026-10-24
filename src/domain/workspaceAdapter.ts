import type { WidgetId } from "./canvas";
import type { TabState, TileId } from "./tabState";
import {
  normalizeWorkspaceLayout,
  workspaceTileItemId,
  workspaceWidgetItemId,
  type WorkspaceGridPlacement,
  type WorkspaceItemId,
  type WorkspaceLayout,
  type WorkspacePage
} from "./workspace";

const workspaceWidgetIds: readonly Exclude<WidgetId, "shortcutGrid">[] = [
  "search",
  "weather",
  "dateTime",
  "rss"
];

/**
 * Projects the existing persisted TabState into the new workspace contract.
 *
 * This is intentionally a read-only compatibility seam: it does not change
 * persistence, schemaVersion, widget settings, shortcut pages, or folder data.
 * Until the workspace renderer and reverse adapter are ready, the legacy
 * state remains the source of truth.
 */
export function tabStateToWorkspaceLayout(state: TabState): WorkspaceLayout {
  const topLevelTileIds = getTopLevelTileIds(state);
  const knownItemIds = new Set<WorkspaceItemId>([
    ...topLevelTileIds.map(workspaceTileItemId),
    ...workspaceWidgetIds.map(workspaceWidgetItemId)
  ]);

  const pages: WorkspacePage[] = state.pages.map((page) => ({
    id: page.id,
    itemIds: page.tileIds
      .filter((tileId) => topLevelTileIds.includes(tileId))
      .map(workspaceTileItemId)
  }));

  // Keep orphaned top-level tiles visible if an older or partially-written
  // state contains a tile that is not referenced by any saved page.
  const assignedTiles = new Set(pages.flatMap((page) => page.itemIds));
  const orphanedTiles = topLevelTileIds
    .map(workspaceTileItemId)
    .filter((itemId) => !assignedTiles.has(itemId));
  if (orphanedTiles.length > 0) {
    pages[0] ??= { id: "page-1", itemIds: [] };
    pages[0].itemIds.push(...orphanedTiles);
  }

  // Existing widgets do not yet have page membership. Keep them on the first
  // workspace page while preserving their legacy canvas coordinates.
  pages[0] ??= { id: "page-1", itemIds: [] };
  pages[0].itemIds.push(...workspaceWidgetIds.map(workspaceWidgetItemId));

  const placements: WorkspaceLayout["placements"] = {};
  for (const widgetId of workspaceWidgetIds) {
    const legacyPlacement = state.canvas.widgets[widgetId].placement;
    placements[workspaceWidgetItemId(widgetId)] = toGridPlacement(legacyPlacement);
  }

  return normalizeWorkspaceLayout(
    { schemaVersion: 1, pages, placements },
    knownItemIds
  );
}

/**
 * Applies workspace page membership and widget geometry to a copy of legacy
 * state. Shortcut/folder tile records and folder child relationships are
 * preserved; tile coordinates are intentionally not stored in legacy state.
 *
 * This conversion is pure and is not wired to persistence yet. Callers should
 * validate a workspace layout against the current state and grid metrics
 * before using the result as a saved state.
 */
export function workspaceLayoutToTabState(
  state: TabState,
  layout: WorkspaceLayout
): TabState {
  const topLevelTileIds = getTopLevelTileIds(state);
  const knownItemIds = new Set<WorkspaceItemId>([
    ...topLevelTileIds.map(workspaceTileItemId),
    ...workspaceWidgetIds.map(workspaceWidgetItemId)
  ]);
  const normalized = normalizeWorkspaceLayout(layout, knownItemIds);
  const assignedTiles = new Set<TileId>();
  const pages = normalized.pages.map((page) => ({
    id: page.id,
    tileIds: page.itemIds.flatMap((itemId) => {
      if (!itemId.startsWith("tile:")) return [];
      const tileId = itemId.slice("tile:".length);
      if (!topLevelTileIds.includes(tileId) || assignedTiles.has(tileId)) return [];
      assignedTiles.add(tileId);
      return [tileId];
    })
  }));

  // Do not lose a valid legacy tile if a caller supplies a partial layout.
  const unassignedTiles = topLevelTileIds.filter((tileId) => !assignedTiles.has(tileId));
  if (unassignedTiles.length > 0) {
    pages[0] ??= { id: "page-1", tileIds: [] };
    pages[0].tileIds.push(...unassignedTiles);
  }

  const widgets = { ...state.canvas.widgets };
  for (const widgetId of workspaceWidgetIds) {
    const placement = normalized.placements[workspaceWidgetItemId(widgetId)];
    if (!placement) continue;
    widgets[widgetId] = {
      ...widgets[widgetId],
      placement: fromGridPlacement(placement)
    };
  }

  return {
    ...state,
    pages,
    canvas: {
      ...state.canvas,
      widgets
    }
  };
}

function getTopLevelTileIds(state: TabState): TileId[] {
  const topLevelTileIds = new Set<TileId>();
  for (const page of state.pages) {
    for (const tileId of page.tileIds) {
      const tile = state.tiles[tileId];
      if (tile && (tile.kind === "shortcut" || tile.kind === "folder")) {
        topLevelTileIds.add(tileId);
      }
    }
  }

  // Include valid top-level tiles omitted from pages. Build the child set once
  // so this remains linear in the number of tiles/folder links.
  const folderChildIds = new Set<TileId>();
  for (const tile of Object.values(state.tiles)) {
    if (tile.kind === "folder") {
      for (const childId of tile.childIds) {
        folderChildIds.add(childId);
      }
    }
  }

  for (const tile of Object.values(state.tiles)) {
    if (tile.kind === "folder" || !folderChildIds.has(tile.id)) {
      topLevelTileIds.add(tile.id);
    }
  }

  return [...topLevelTileIds];
}

function toGridPlacement(placement: {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}): WorkspaceGridPlacement {
  return {
    column: placement.x,
    row: placement.y,
    columnSpan: placement.width,
    rowSpan: placement.height,
    zIndex: placement.zIndex
  };
}

function fromGridPlacement(placement: WorkspaceGridPlacement) {
  return {
    x: placement.column,
    y: placement.row,
    width: placement.columnSpan,
    height: placement.rowSpan,
    zIndex: placement.zIndex
  };
}
