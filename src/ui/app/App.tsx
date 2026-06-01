import { CSSProperties, useState } from "react";
import { defaultTabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { CanvasWidgetHost } from "../canvas";
import { SettingsDrawer } from "../settings";
import { FolderModal, ShortcutModal } from "../modals";
import { FolderPanel } from "../widgets/shortcut-grid";
import { useNewTabController } from "./useNewTabController";
import { useCanvasMetrics } from "../canvas";

export function App() {
  const controller = useNewTabController();
  const [query, setQuery] = useState("");
  const [isCanvasEditMode, setIsCanvasEditMode] = useState(false);
  const [outgoingDragSource, setOutgoingDragSource] = useState<DragSource | null>(null);

  const tabState = controller.tabState ?? defaultTabState;
  const canvasMetrics = useCanvasMetrics(tabState.canvas.targetCellSize);
  const searchWidget = tabState.canvas.widgets.search;
  const searchSettings = searchWidget.settings;

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

        <CanvasWidgetHost
          canvasMetrics={canvasMetrics}
          controller={controller}
          isCanvasEditMode={isCanvasEditMode}
          outgoingDragSource={outgoingDragSource}
          query={query}
          setOutgoingDragSource={setOutgoingDragSource}
          setQuery={setQuery}
          tabState={tabState}
        />
      </section>

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
