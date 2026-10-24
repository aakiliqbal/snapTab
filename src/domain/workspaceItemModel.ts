import type { WidgetId, WidgetInstance, WidgetPlacement } from "./canvas";
import type { TabState, Tile } from "./tabState";
import { tabStateToWorkspaceLayout } from "./workspaceAdapter";
import {
  workspaceTileItemId,
  workspaceWidgetItemId,
  type WorkspaceGridPlacement,
  type WorkspaceItemId,
  type WorkspaceLayout
} from "./workspace";

export type ResolvedWorkspaceItem =
  | {
      kind: "widget";
      id: WorkspaceItemId;
      widgetId: Exclude<WidgetId, "shortcutGrid">;
      enabled: boolean;
      placement: WorkspaceGridPlacement;
      widget: Exclude<WidgetInstance, { type: "shortcutGrid" }>;
    }
  | {
      kind: "shortcut";
      id: WorkspaceItemId;
      tileId: string;
      tile: Extract<Tile, { kind: "shortcut" }>;
      placement: WorkspaceGridPlacement;
    }
  | {
      kind: "folder";
      id: WorkspaceItemId;
      tileId: string;
      tile: Extract<Tile, { kind: "folder" }>;
      placement: WorkspaceGridPlacement;
    };

/**
 * Resolves a page's IDs into typed render models. This keeps the renderer from
 * understanding legacy TabState page structures or checking raw IDs itself.
 * It is pure and safe to call from a memoized selector.
 */
export function resolveWorkspacePageItems(
  state: TabState,
  pageId: string,
  layout: WorkspaceLayout = tabStateToWorkspaceLayout(state)
): ResolvedWorkspaceItem[] {
  const page = layout.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    return [];
  }

  return page.itemIds.flatMap<ResolvedWorkspaceItem>((itemId, index) => {
    const placement = layout.placements[itemId] ?? defaultItemPlacement(index);
    if (itemId.startsWith("widget:")) {
      const widgetId = itemId.slice("widget:".length) as WidgetId;
      if (widgetId === "shortcutGrid" || !(widgetId in state.canvas.widgets)) {
        return [];
      }

      const widget = state.canvas.widgets[widgetId];
      return [{
        kind: "widget" as const,
        id: itemId,
        widgetId,
        enabled: widget.enabled,
        placement,
        widget: widget as Exclude<WidgetInstance, { type: "shortcutGrid" }>
      }];
    }

    const tileId = itemId.slice("tile:".length);
    const tile = state.tiles[tileId];
    if (!tile) {
      return [];
    }

    if (tile.kind === "folder") {
      return [{ kind: "folder" as const, id: itemId, tileId, tile, placement }];
    }

    return [{ kind: "shortcut" as const, id: itemId, tileId, tile, placement }];
  });
}

function defaultItemPlacement(index: number): WorkspaceGridPlacement {
  return {
    column: index % 6,
    row: Math.floor(index / 6),
    columnSpan: 1,
    rowSpan: 1,
    zIndex: 1
  };
}

/** Convert the legacy canvas geometry when a renderer needs pixel-grid units. */
export function toLegacyWidgetPlacement(placement: WorkspaceGridPlacement): WidgetPlacement {
  return {
    x: placement.column,
    y: placement.row,
    width: placement.columnSpan,
    height: placement.rowSpan,
    zIndex: placement.zIndex
  };
}
