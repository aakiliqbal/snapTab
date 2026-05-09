import { CSSProperties, FormEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { defaultTabState, searchProviders, type SearchProviderId } from "../domain/tabState";
import type { DragSource } from "./drag/dragModel";
import { CanvasSurface, WidgetFrame } from "./CanvasSurface";
import { SettingsDrawer } from "./SettingsDrawer";
import { ShortcutGrid, type ShortcutPageItem } from "./ShortcutGrid";
import { FolderModal } from "./modals/FolderModal";
import { FolderPanel } from "./modals/FolderPanel";
import { ShortcutModal } from "./modals/ShortcutModal";
import { useNewTabController } from "./hooks/useNewTabController";
import { useCanvasMetrics } from "./hooks/useCanvasMetrics";
import { useShortcutGridMetrics } from "./hooks/useShortcutGridMetrics";

export function App() {
  const controller = useNewTabController();
  const [query, setQuery] = useState("");
  const [isCanvasEditMode, setIsCanvasEditMode] = useState(false);
  const [outgoingDragSource, setOutgoingDragSource] = useState<DragSource | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockUntilRef = useRef(0);

  const shortcutPageItems = useMemo<ShortcutPageItem[]>(
    () => controller.topLevelTiles,
    [controller.topLevelTiles]
  );

  const tabState = controller.tabState ?? defaultTabState;
  const canvasMetrics = useCanvasMetrics(tabState.canvas.targetCellSize);
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const searchWidget = tabState.canvas.widgets.search;
  const shortcutGridSettings = shortcutGridWidget.settings;
  const searchSettings = searchWidget.settings;
  const shortcutWidgetWidth = shortcutGridWidget.placement.width * canvasMetrics.cellWidth;
  const shortcutWidgetHeight = shortcutGridWidget.placement.height * canvasMetrics.cellHeight;
  const derivedShortcutColumns = Math.max(1, Math.floor(shortcutWidgetWidth / 116));
  const derivedShortcutRows = Math.max(1, Math.floor(shortcutWidgetHeight / (shortcutGridSettings.showLabels ? 118 : 92)));
  const effectiveGridLayout = {
    ...tabState.layout.gridLayout,
    rows: derivedShortcutRows,
    columns: derivedShortcutColumns,
    iconSize: shortcutGridSettings.iconSize,
    columnSpacing: shortcutGridSettings.columnSpacing,
    lineSpacing: shortcutGridSettings.lineSpacing
  };
  const pageCapacity = effectiveGridLayout.rows * effectiveGridLayout.columns;
  const shortcutPageCount = Math.max(1, Math.ceil(shortcutPageItems.length / pageCapacity));
  const activeShortcutPageIndex = Math.min(controller.activeShortcutPage, shortcutPageCount - 1);
  const visibleShortcutPageItems = shortcutPageItems.slice(
    activeShortcutPageIndex * pageCapacity,
    (activeShortcutPageIndex + 1) * pageCapacity
  );
  const { maxFittedIconSize, fittedLabelSize, fittedTileGap } = useShortcutGridMetrics(
    controller.gridRef,
    effectiveGridLayout,
    shortcutGridSettings.showLabels,
    activeShortcutPageIndex
  );

  useEffect(() => {
    if (controller.activeShortcutPage >= shortcutPageCount) {
      controller.setActiveShortcutPage(shortcutPageCount - 1);
    }
  }, [controller.activeShortcutPage, controller.setActiveShortcutPage, shortcutPageCount]);

  const searchBoxHeight = Math.max(44, searchWidget.placement.height * canvasMetrics.cellHeight);
  const searchBoxRoundness = Math.min(100, Math.max(0, searchSettings.radius));
  const searchBoxRadius = (searchBoxHeight / 2) * (searchBoxRoundness / 100);
  const gridLayout = effectiveGridLayout;
  const iconSize = Math.max(18, Math.min(maxFittedIconSize, (86 * gridLayout.iconSize) / 100));
  const columnGap = (34 * gridLayout.columnSpacing) / 100;
  const rowGap = (34 * gridLayout.lineSpacing) / 100;

  const layoutStyle = {
    "--icon-size": `${iconSize}px`,
    "--grid-column-gap": `${columnGap}px`,
    "--grid-row-gap": `${rowGap}px`,
    "--grid-columns": `${gridLayout.columns}`,
    "--grid-rows": `${gridLayout.rows}`,
    "--quick-link-label-font-size": `${fittedLabelSize}px`,
    "--quick-link-tile-gap": `${fittedTileGap}px`,
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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.location.href = `${controller.activeSearchProvider.url}${encodeURIComponent(trimmedQuery)}`;
  }

  function moveShortcutPage(direction: 1 | -1) {
    controller.setActiveShortcutPage((current) => {
      if (direction > 0) {
        return (current + 1) % shortcutPageCount;
      }

      return (current - 1 + shortcutPageCount) % shortcutPageCount;
    });
  }

  function handleShortcutWheel(event: WheelEvent<HTMLDivElement>) {
    if (isCanvasEditMode || controller.hasOverlayOpen || shortcutPageCount <= 1 || isTextEntryControl(event.target)) {
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

        <CanvasSurface editMode={isCanvasEditMode} metrics={canvasMetrics}>
          <WidgetFrame
            editMode={isCanvasEditMode}
            enabled={searchWidget.enabled}
            label="Search Widget"
            metrics={canvasMetrics}
            onMove={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
            onResize={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
            placement={searchWidget.placement}
            widgetId="search"
          >
          <section className="search-panel">
            {searchSettings.showProviderTabs ? (
              <div className="search-tabs" role="tablist" aria-label="Search provider">
                {Object.entries(searchProviders).map(([id, provider]) => (
                  <button
                    className={id === tabState.searchProvider ? "active" : ""}
                    key={id}
                    onClick={() => void controller.changeSearchProvider(id as SearchProviderId)}
                    type="button"
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            ) : null}

            <form className="search-box" onSubmit={submitSearch}>
              {searchSettings.showSearchMark ? (
                <span className="search-mark">{controller.activeSearchProvider.label.slice(0, 1)}</span>
              ) : null}
              <input
                aria-label={`Search with ${controller.activeSearchProvider.label}`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter search"
                value={query}
              />
            </form>
          </section>
          </WidgetFrame>

          <WidgetFrame
            editMode={isCanvasEditMode}
            enabled={shortcutGridWidget.enabled}
            label="Shortcut Grid Widget"
            metrics={canvasMetrics}
            onMove={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
            onResize={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
            placement={shortcutGridWidget.placement}
            widgetId="shortcutGrid"
          >
            <div className="shortcut-grid-widget" onWheel={handleShortcutWheel}>
              <ShortcutGrid
                activeShortcutPageIndex={activeShortcutPageIndex}
                dispatchDropAction={controller.dispatchDropAction}
                gridRef={controller.gridRef}
                outgoingDragSource={isCanvasEditMode ? null : outgoingDragSource}
                onClearOutgoingDrag={() => setOutgoingDragSource(null)}
                onEditFolder={controller.openEditFolderDialog}
                onEditShortcut={controller.openEditShortcutDialog}
                onOpenNewShortcutDialog={controller.openNewShortcutDialog}
                onSetActiveFolderId={controller.setActiveFolderId}
                onSetActiveShortcutPage={controller.setActiveShortcutPage}
                pageCapacity={pageCapacity}
                pageCount={shortcutPageCount}
                showLabels={shortcutGridSettings.showLabels}
                showPageDots={shortcutGridSettings.showPageDots}
                tabState={tabState}
                visibleShortcutPageItems={visibleShortcutPageItems}
              />
            </div>
          </WidgetFrame>
        </CanvasSurface>
      </section>

      {controller.isSettingsDrawerOpen ? (
        <SettingsDrawer
          backupMessage={controller.backupMessage}
          changeLayout={controller.changeLayout}
          changeSearchProvider={controller.changeSearchProvider}
          changeSearchWidgetSetting={controller.changeSearchWidgetSetting}
          changeShortcutGridWidgetSetting={controller.changeShortcutGridWidgetSetting}
          changeWallpaperSetting={controller.changeWallpaperSetting}
          close={() => controller.setIsSettingsDrawerOpen(false)}
          exportBackup={controller.exportBackup}
          importBackup={controller.importBackup}
          resetWallpaper={controller.resetWallpaper}
          setWidgetEnabled={(widgetId, enabled) => controller.setWidgetEnabled(widgetId, enabled, canvasMetrics)}
          tabState={tabState}
          uploadWallpaper={controller.uploadWallpaper}
          wallpaperMessage={controller.wallpaperMessage}
        />
      ) : null}

      {controller.activeFolder ? (
        <FolderPanel
          activeFolder={controller.activeFolder}
          activeShortcutPageIndex={activeShortcutPageIndex}
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

function isTextEntryControl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}
