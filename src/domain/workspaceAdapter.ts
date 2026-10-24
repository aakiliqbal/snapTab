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

  // Include valid top-level tiles omitted from pages. Folder children are
  // deliberately excluded because folders are single workspace items.
  for (const tile of Object.values(state.tiles)) {
    if (tile.kind === "folder") {
      topLevelTileIds.add(tile.id);
      continue;
    }

    const isFolderChild = Object.values(state.tiles).some(
      (candidate) => candidate.kind === "folder" && candidate.childIds.includes(tile.id)
    );
    if (!isFolderChild) {
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
