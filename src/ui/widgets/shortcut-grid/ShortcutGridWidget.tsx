import { CSSProperties, WheelEvent, useEffect, useRef, type RefObject } from "react";
import type { DropAction } from "../../../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../../../domain/tabOperations";
import type { Shortcut, TabState } from "../../../domain/tabState";
import type { DragSource } from "../../drag/dragModel";
import { deriveShortcutGridWidgetModel } from "./shortcutPageModel";
import { useShortcutGridMetrics } from "./useShortcutGridMetrics";
import { ShortcutGrid } from "./ShortcutGrid";

type CanvasMetrics = {
  cellWidth: number;
  cellHeight: number;
};

type ShortcutGridWidgetProps = {
  activeShortcutPage: number;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  hasOverlayOpen: boolean;
  isCanvasEditMode: boolean;
  onClearOutgoingDrag: () => void;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  outgoingDragSource: DragSource | null;
  setActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  settings: TabState["canvas"]["widgets"]["shortcutGrid"]["settings"];
  tabState: TabState;
  topLevelTiles: ResolvedTopLevelTile[];
  widgetPlacement: TabState["canvas"]["widgets"]["shortcutGrid"]["placement"];
  canvasMetrics: CanvasMetrics;
};

export function ShortcutGridWidget({
  activeShortcutPage,
  canvasMetrics,
  dispatchDropAction,
  gridRef,
  hasOverlayOpen,
  isCanvasEditMode,
  onClearOutgoingDrag,
  onEditFolder,
  onEditShortcut,
  onSetActiveFolderId,
  outgoingDragSource,
  setActiveShortcutPage,
  settings,
  tabState,
  topLevelTiles,
  widgetPlacement
}: ShortcutGridWidgetProps) {
  const wheelDeltaRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const { activeShortcutPageIndex, gridLayout, pageCapacity, pageCount, visibleShortcutPageItems } =
    deriveShortcutGridWidgetModel({ activeShortcutPage, canvasMetrics, settings, tabState, topLevelTiles, widgetPlacement });
  const { maxFittedIconSize, fittedLabelSize, fittedTileGap } = useShortcutGridMetrics(
    gridRef,
    gridLayout,
    settings.showLabels,
    activeShortcutPageIndex
  );
  const layoutStyle = {
    "--icon-size": `${Math.max(18, Math.min(maxFittedIconSize, (86 * gridLayout.iconSize) / 100))}px`,
    "--grid-column-gap": `${(34 * gridLayout.columnSpacing) / 100}px`,
    "--grid-row-gap": `${(34 * gridLayout.lineSpacing) / 100}px`,
    "--grid-columns": `${gridLayout.columns}`,
    "--grid-rows": `${gridLayout.rows}`,
    "--quick-link-label-font-size": `${fittedLabelSize}px`,
    "--quick-link-tile-gap": `${fittedTileGap}px`
  } as CSSProperties;

  useEffect(() => {
    if (activeShortcutPage >= pageCount) {
      setActiveShortcutPage(pageCount - 1);
    }
  }, [activeShortcutPage, pageCount, setActiveShortcutPage]);

  function moveShortcutPage(direction: 1 | -1) {
    setActiveShortcutPage((current) => {
      if (direction > 0) {
        return (current + 1) % pageCount;
      }

      return (current - 1 + pageCount) % pageCount;
    });
  }

  function handleShortcutWheel(event: WheelEvent<HTMLDivElement>) {
    if (isCanvasEditMode || hasOverlayOpen || pageCount <= 1 || isTextEntryControl(event.target)) {
      return;
    }

    event.preventDefault();
    const now = Date.now();
    if (now < wheelLockUntilRef.current) {
      return;
    }

    wheelDeltaRef.current += event.deltaY;
    if (Math.abs(wheelDeltaRef.current) < 90) {
      return;
    }

    moveShortcutPage(wheelDeltaRef.current > 0 ? 1 : -1);
    wheelDeltaRef.current = 0;
    wheelLockUntilRef.current = now + 420;
  }

  return (
    <div className="shortcut-grid-widget" onWheel={handleShortcutWheel} style={layoutStyle}>
      <ShortcutGrid
        activeShortcutPageIndex={activeShortcutPageIndex}
        dispatchDropAction={dispatchDropAction}
        gridRef={gridRef}
        outgoingDragSource={isCanvasEditMode ? null : outgoingDragSource}
        onClearOutgoingDrag={onClearOutgoingDrag}
        onEditFolder={onEditFolder}
        onEditShortcut={onEditShortcut}
        onSetActiveFolderId={onSetActiveFolderId}
        onSetActiveShortcutPage={setActiveShortcutPage}
        pageCapacity={pageCapacity}
        pageCount={pageCount}
        showLabels={settings.showLabels}
        showPageDots={settings.showPageDots}
        tabState={tabState}
        visibleShortcutPageItems={visibleShortcutPageItems}
      />
    </div>
  );
}

function isTextEntryControl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}
