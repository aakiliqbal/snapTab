import { MouseEvent, useEffect, useState, type RefObject } from "react";
import type { CanvasGrid, SearchWidgetSettings, ShortcutGridWidgetSettings, WidgetId, WidgetPlacement } from "../../domain/canvas";
import type { DropAction } from "../../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../../domain/tabOperations";
import { searchProviders, type SearchProviderId, type Shortcut, type TabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { WidgetContextMenu, type ContextMenuState } from "../widgets/WidgetContextMenu";
import { WidgetFrame } from "../widgets/WidgetFrame";
import { SearchWidget } from "../widgets/search";
import { ShortcutGridWidget } from "../widgets/shortcut-grid";
import { CanvasSurface } from "./CanvasSurface";

type CanvasMetrics = ReturnType<typeof import("./useCanvasMetrics").useCanvasMetrics>;

export type CanvasWidgetController = {
  activeSearchProvider: (typeof searchProviders)[SearchProviderId];
  activeShortcutPage: number;
  changeSearchProvider: (providerId: SearchProviderId) => void;
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  hasOverlayOpen: boolean;
  openEditFolderDialog: (folder: ResolvedFolder) => void;
  openEditShortcutDialog: (shortcut: Shortcut, folderId?: string | null) => void;
  setActiveFolderId: (folderId: string | null) => void;
  setActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean, grid?: CanvasGrid) => void;
  topLevelTiles: ResolvedTopLevelTile[];
  updateWidgetPlacement: (widgetId: WidgetId, placement: WidgetPlacement, grid: CanvasGrid) => void;
};

type CanvasWidgetHostProps = {
  canvasMetrics: CanvasMetrics;
  controller: CanvasWidgetController;
  isCanvasEditMode: boolean;
  outgoingDragSource: DragSource | null;
  query: string;
  setOutgoingDragSource: (source: DragSource | null) => void;
  setQuery: (query: string) => void;
  tabState: TabState;
};

export function CanvasWidgetHost({
  canvasMetrics,
  controller,
  isCanvasEditMode,
  outgoingDragSource,
  query,
  setOutgoingDragSource,
  setQuery,
  tabState
}: CanvasWidgetHostProps) {
  // Canvas owns Widget mounting and placement wiring so App stays focused on New Tab Surface overlays.
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const searchWidget = tabState.canvas.widgets.search;

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("keydown", closeContextMenu);
    return () => window.removeEventListener("keydown", closeContextMenu);
  }, [contextMenu]);

  function openCanvasContextMenu(event: MouseEvent<HTMLElement>) {
    if (!isCanvasEditMode || event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    setContextMenu({ type: "canvas", x: event.clientX, y: event.clientY });
  }

  function openWidgetContextMenu(widgetId: "search" | "shortcutGrid", event: MouseEvent<HTMLElement>) {
    if (!isCanvasEditMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ type: "widget", widgetId, x: event.clientX, y: event.clientY });
  }

  return (
    <>
      <CanvasSurface editMode={isCanvasEditMode} metrics={canvasMetrics} onCanvasContextMenu={openCanvasContextMenu}>
        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={searchWidget.enabled}
          label="Search Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={searchWidget.placement}
          widgetId="search"
        >
          <SearchWidget
            activeProvider={controller.activeSearchProvider}
            changeSearchProvider={controller.changeSearchProvider}
            query={query}
            setQuery={setQuery}
            settings={searchWidget.settings}
          />
        </WidgetFrame>

        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={shortcutGridWidget.enabled}
          label="Shortcut Grid Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={shortcutGridWidget.placement}
          widgetId="shortcutGrid"
        >
          <ShortcutGridWidget
            activeShortcutPage={controller.activeShortcutPage}
            canvasMetrics={canvasMetrics}
            dispatchDropAction={controller.dispatchDropAction}
            gridRef={controller.gridRef}
            hasOverlayOpen={controller.hasOverlayOpen}
            isCanvasEditMode={isCanvasEditMode}
            onClearOutgoingDrag={() => setOutgoingDragSource(null)}
            onEditFolder={controller.openEditFolderDialog}
            onEditShortcut={controller.openEditShortcutDialog}
            onSetActiveFolderId={controller.setActiveFolderId}
            outgoingDragSource={outgoingDragSource}
            setActiveShortcutPage={controller.setActiveShortcutPage}
            settings={shortcutGridWidget.settings}
            tabState={tabState}
            topLevelTiles={controller.topLevelTiles}
            widgetPlacement={shortcutGridWidget.placement}
          />
        </WidgetFrame>
      </CanvasSurface>

      {contextMenu ? (
        <WidgetContextMenu
          changeSearchWidgetSetting={controller.changeSearchWidgetSetting}
          changeShortcutGridWidgetSetting={controller.changeShortcutGridWidgetSetting}
          close={() => setContextMenu(null)}
          menu={contextMenu}
          setWidgetEnabled={(widgetId, enabled) => controller.setWidgetEnabled(widgetId, enabled, canvasMetrics)}
          tabState={tabState}
        />
      ) : null}
    </>
  );
}
