import { CSSProperties, MouseEvent, useEffect, useState } from "react";
import { defaultTabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { CanvasSurface, WidgetFrame } from "../canvas/CanvasSurface";
import { SettingsDrawer } from "../SettingsDrawer";
import { WidgetContextMenu, type ContextMenuState } from "../widgets/WidgetContextMenu";
import { SearchWidget } from "../widgets/search/SearchWidget";
import { ShortcutGridWidget } from "../widgets/shortcut-grid/ShortcutGridWidget";
import { FolderModal } from "../modals/FolderModal";
import { FolderPanel } from "../modals/FolderPanel";
import { ShortcutModal } from "../modals/ShortcutModal";
import { useNewTabController } from "./useNewTabController";
import { useCanvasMetrics } from "../canvas/useCanvasMetrics";

export function App() {
  const controller = useNewTabController();
  const [query, setQuery] = useState("");
  const [isCanvasEditMode, setIsCanvasEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [outgoingDragSource, setOutgoingDragSource] = useState<DragSource | null>(null);

  const tabState = controller.tabState ?? defaultTabState;
  const canvasMetrics = useCanvasMetrics(tabState.canvas.targetCellSize);
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const searchWidget = tabState.canvas.widgets.search;
  const searchSettings = searchWidget.settings;

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

  const searchBoxHeight = Math.max(44, searchWidget.placement.height * canvasMetrics.cellHeight);
  const searchBoxRoundness = Math.min(100, Math.max(0, searchSettings.radius));
  const searchBoxRadius = (searchBoxHeight / 2) * (searchBoxRoundness / 100);

  const layoutStyle = {
    "--search-box-size": "100%",
    "--search-box-height": `${searchBoxHeight}px`,
    "--search-box-mark-size": `${Math.max(24, (32 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-font-size": `${Math.max(15, (18 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-font-size": `${Math.max(13, (16 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-gap": `${Math.max(14, (38 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-radius": `${searchBoxRadius}px`,
    "--search-box-opacity": `${searchSettings.opacity / 100}`,
    "--wallpaper-dim": `${tabState.wallpaper.dim / 100}`,
    "--wallpaper-blur": `${tabState.wallpaper.blur}px`
  } as CSSProperties;

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

  if (!controller.tabState) {
    return <main className="new-tab loading">Loading</main>;
  }

  return (
    <main className="new-tab" style={layoutStyle}>
      <div className="wallpaper" aria-hidden="true">
        {tabState.wallpaper.type === "dataUrl" && tabState.wallpaper.value ? (
          <img className="wallpaper-media" src={tabState.wallpaper.value} alt="" />
        ) : null}
      </div>

      <section className="workspace" aria-label="New tab workspace">
        <div className="toolbar">
          <button
            className={`edit-mode-button${isCanvasEditMode ? " active" : ""}`}
            type="button"
            aria-pressed={isCanvasEditMode}
            aria-label={isCanvasEditMode ? "Turn off canvas edit mode" : "Turn on canvas edit mode"}
            onClick={() => setIsCanvasEditMode((current) => !current)}
          >
            {isCanvasEditMode ? "Done" : "Edit"}
          </button>
          <button
            className="settings-button"
            type="button"
            aria-label="Open settings menu"
            onClick={() => controller.setIsSettingsDrawerOpen(true)}
          >
            <span className="gear-icon" aria-hidden="true">
              ⚙
            </span>
          </button>
        </div>

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
              settings={searchSettings}
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
              onOpenNewShortcutDialog={controller.openNewShortcutDialog}
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
      </section>

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

      {controller.isSettingsDrawerOpen ? (
        <SettingsDrawer
          backupMessage={controller.backupMessage}
          changeWallpaperSetting={controller.changeWallpaperSetting}
          close={() => controller.setIsSettingsDrawerOpen(false)}
          exportBackup={controller.exportBackup}
          importBackup={controller.importBackup}
          resetWallpaper={controller.resetWallpaper}
          tabState={tabState}
          uploadWallpaper={controller.uploadWallpaper}
          wallpaperMessage={controller.wallpaperMessage}
        />
      ) : null}

      {controller.activeFolder ? (
        <FolderPanel
          activeFolder={controller.activeFolder}
          activeShortcutPageIndex={controller.activeShortcutPage}
          dispatchDropAction={controller.dispatchDropAction}
          onClose={() => controller.setActiveFolderId(null)}
          onEditFolder={controller.openEditFolderDialog}
          onEditShortcut={(shortcut) => controller.openEditShortcutDialog(shortcut, controller.activeFolder?.id ?? null)}
          onOpenNewShortcutDialog={controller.openNewShortcutDialog}
          onStartOutgoingDrag={(source) => {
            setOutgoingDragSource(source);
          }}
          tabState={tabState}
        />
      ) : null}

      {controller.shortcutDraft ? (
        <ShortcutModal
          draft={controller.shortcutDraft}
          iconRecommendations={controller.shortcutIconRecommendations}
          onApplyRecommendedIcon={controller.chooseRecommendedIcon}
          onChangeDraft={controller.setShortcutDraft}
          onClose={() => controller.setShortcutDraft(null)}
          onDelete={() => void controller.deleteShortcut()}
          onSave={controller.saveShortcut}
          onUploadIcon={(file) => void controller.uploadShortcutIcon(file)}
        />
      ) : null}

      {controller.folderDraft ? (
        <FolderModal
          draft={controller.folderDraft}
          onChangeDraft={controller.setFolderDraft}
          onClose={() => controller.setFolderDraft(null)}
          onDelete={() => void controller.deleteFolder()}
          onSave={controller.saveFolder}
        />
      ) : null}
    </main>
  );
}
