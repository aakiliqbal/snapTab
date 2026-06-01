import type { ResolvedTopLevelTile } from "../../../domain/tabOperations";
import type { GridLayoutSettings, TabState } from "../../../domain/tabState";

export type ShortcutPageItem = ResolvedTopLevelTile;

type CanvasMetrics = {
  cellWidth: number;
  cellHeight: number;
};

type ShortcutGridWidgetModelInput = {
  activeShortcutPage: number;
  canvasMetrics: CanvasMetrics;
  settings: TabState["canvas"]["widgets"]["shortcutGrid"]["settings"];
  tabState: TabState;
  topLevelTiles: ResolvedTopLevelTile[];
  widgetPlacement: TabState["canvas"]["widgets"]["shortcutGrid"]["placement"];
};

// Shortcut Pages are a Shortcut Grid Widget concern, but the page math is pure so Grid Layout Capacity stays testable.
export function deriveShortcutGridWidgetModel({
  activeShortcutPage,
  canvasMetrics,
  settings,
  tabState,
  topLevelTiles,
  widgetPlacement
}: ShortcutGridWidgetModelInput) {
  const gridLayout = deriveShortcutGridLayoutFromWidget({ canvasMetrics, settings, tabState, widgetPlacement });
  const pageCapacity = gridLayout.rows * gridLayout.columns;
  const pageCount = Math.max(1, Math.ceil(topLevelTiles.length / pageCapacity));
  const activeShortcutPageIndex = Math.min(activeShortcutPage, pageCount - 1);
  const visibleShortcutPageItems: ShortcutPageItem[] = topLevelTiles.slice(
    activeShortcutPageIndex * pageCapacity,
    (activeShortcutPageIndex + 1) * pageCapacity
  );

  return { activeShortcutPageIndex, gridLayout, pageCapacity, pageCount, visibleShortcutPageItems };
}

function deriveShortcutGridLayoutFromWidget({
  canvasMetrics,
  settings,
  tabState,
  widgetPlacement
}: Omit<ShortcutGridWidgetModelInput, "activeShortcutPage" | "topLevelTiles">): GridLayoutSettings {
  const shortcutWidgetWidth = widgetPlacement.width * canvasMetrics.cellWidth;
  const shortcutWidgetHeight = widgetPlacement.height * canvasMetrics.cellHeight;
  const shortcutIconScale = settings.iconSize / 100;
  const estimatedTileWidth = Math.max(84, 86 * shortcutIconScale + 30);
  const estimatedTileHeight = Math.max(84, 86 * shortcutIconScale + (settings.showLabels ? 42 : 18));

  return {
    ...tabState.layout.gridLayout,
    rows: Math.max(1, Math.floor((shortcutWidgetHeight - 56) / estimatedTileHeight)),
    columns: Math.max(1, Math.floor(shortcutWidgetWidth / estimatedTileWidth)),
    iconSize: settings.iconSize,
    columnSpacing: settings.columnSpacing,
    lineSpacing: settings.lineSpacing
  };
}

export function getTilePagePosition(state: TabState, tileId: string) {
  for (const page of state.pages) {
    const index = page.tileIds.indexOf(tileId);
    if (index >= 0) {
      return { pageId: page.id, index };
    }
  }

  return null;
}

export function getVisualPageEndPosition(state: TabState, visualPageIndex: number, pageCapacity: number) {
  const topLevelCount = state.pages.reduce((count, page) => count + page.tileIds.length, 0);
  const visualEndIndex = Math.min((visualPageIndex + 1) * pageCapacity, topLevelCount);
  return getInsertionPositionFromGlobalIndex(state, visualEndIndex);
}

export function getInsertionPositionFromGlobalIndex(state: TabState, globalIndex: number) {
  let offset = 0;

  for (const page of state.pages) {
    const pageEnd = offset + page.tileIds.length;
    if (globalIndex <= pageEnd) {
      return { pageId: page.id, index: Math.max(0, globalIndex - offset) };
    }

    offset = pageEnd;
  }

  const fallbackPage = state.pages[state.pages.length - 1] ?? { id: "page-1", tileIds: [] };
  return { pageId: fallbackPage.id, index: fallbackPage.tileIds.length };
}
