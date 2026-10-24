import type { WidgetId } from "./canvas";
import type { TileId } from "./tabState";

/**
 * Stable identity for any item that can live directly on a launcher workspace.
 * Prefixes prevent a widget ID from colliding with a user-created tile ID.
 */
export type WorkspaceItemId = `widget:${WidgetId}` | `tile:${TileId}`;

export type WorkspaceItemRef =
  | { kind: "widget"; id: WorkspaceItemId; widgetId: WidgetId }
  | { kind: "shortcut"; id: WorkspaceItemId; tileId: TileId }
  | { kind: "folder"; id: WorkspaceItemId; tileId: TileId };

export type WorkspaceGridPlacement = {
  /** Zero-based column coordinate within the page grid. */
  column: number;
  /** Zero-based row coordinate within the page grid. */
  row: number;
  /** Number of grid columns occupied by this item. */
  columnSpan: number;
  /** Number of grid rows occupied by this item. */
  rowSpan: number;
  /** Stable visual ordering when items share a stacking context. */
  zIndex: number;
};

export type WorkspacePage = {
  id: string;
  itemIds: WorkspaceItemId[];
};

export type WorkspaceLayout = {
  schemaVersion: 1;
  pages: WorkspacePage[];
  placements: Partial<Record<WorkspaceItemId, WorkspaceGridPlacement>>;
};

export function workspaceWidgetItemId(widgetId: WidgetId): WorkspaceItemId {
  return `widget:${widgetId}`;
}

export function workspaceTileItemId(tileId: TileId): WorkspaceItemId {
  return `tile:${tileId}`;
}

/**
 * Normalizes page membership without mutating inputs. The caller supplies the
 * known item IDs so stale persisted references can be dropped deterministically.
 * This is deliberately pure so persistence migration and UI can share it.
 */
export function normalizeWorkspaceLayout(
  value: Partial<WorkspaceLayout> | null | undefined,
  knownItemIds: ReadonlySet<WorkspaceItemId>
): WorkspaceLayout {
  const pages: WorkspacePage[] = [];
  const seenPageIds = new Set<string>();
  const seenItems = new Set<WorkspaceItemId>();
  const sourcePages = Array.isArray(value?.pages) ? value.pages : [];

  for (const [index, sourcePage] of sourcePages.entries()) {
    if (!sourcePage || !Array.isArray(sourcePage.itemIds)) {
      continue;
    }

    const rawId = typeof sourcePage.id === "string" ? sourcePage.id.trim() : "";
    const baseId = rawId || `page-${index + 1}`;
    let pageId = baseId;
    let suffix = 2;
    while (seenPageIds.has(pageId)) {
      pageId = `${baseId}-${suffix++}`;
    }
    seenPageIds.add(pageId);

    const itemIds: WorkspaceItemId[] = [];
    for (const itemId of sourcePage.itemIds) {
      if (typeof itemId !== "string" || !knownItemIds.has(itemId as WorkspaceItemId) || seenItems.has(itemId as WorkspaceItemId)) {
        continue;
      }
      const normalizedId = itemId as WorkspaceItemId;
      seenItems.add(normalizedId);
      itemIds.push(normalizedId);
    }

    pages.push({ id: pageId, itemIds });
  }

  const normalizedPlacements: WorkspaceLayout["placements"] = {};
  if (value?.placements && typeof value.placements === "object") {
    for (const [rawItemId, rawPlacement] of Object.entries(value.placements)) {
      const itemId = rawItemId as WorkspaceItemId;
      if (!knownItemIds.has(itemId) || !rawPlacement || typeof rawPlacement !== "object") {
        continue;
      }

      const { column, row, columnSpan, rowSpan, zIndex } = rawPlacement;
      if (![column, row, columnSpan, rowSpan, zIndex].every(Number.isFinite)) {
        continue;
      }

      normalizedPlacements[itemId] = {
        column: Math.max(0, Math.floor(column)),
        row: Math.max(0, Math.floor(row)),
        columnSpan: Math.max(1, Math.floor(columnSpan)),
        rowSpan: Math.max(1, Math.floor(rowSpan)),
        zIndex: Math.floor(zIndex)
      };
    }
  }

  if (pages.length === 0) {
    pages.push({ id: "page-1", itemIds: [] });
  }

  return { schemaVersion: 1, pages, placements: normalizedPlacements };
}
