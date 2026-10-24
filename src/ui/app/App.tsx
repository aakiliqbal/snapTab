import { CSSProperties, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { getThemePreset } from "../../domain/themes";
import { resolveWorkspacePageItems } from "../../domain/workspaceItemModel";
import { projectTabStateToWorkspaceGrid } from "../../domain/workspaceProjection";
import { beginWorkspaceDrag, commitWorkspaceDrag, updateWorkspaceDragTarget, type WorkspaceDragSession } from "../../domain/workspaceDrag";
import { moveWorkspaceItemByKeyboard } from "../../domain/workspaceKeyboard";
import type { WorkspaceItemId, WorkspaceLayout } from "../../domain/workspace";
import { workspaceLayoutToTabState } from "../../domain/workspaceAdapter";
import type { TabState } from "../../domain/tabState";
import { subscribeToExternalTabStateChanges, useTabStore } from "../../stores/useTabStore";
import type { DragSource } from "../drag/dragModel";
import { CanvasWidgetHost } from "../canvas";
import { useNewTabController } from "./useNewTabController";
import { useCanvasMetrics } from "../canvas";
import { WorkspacePager } from "../workspace/WorkspacePager";
import { createWorkspaceTileRenderers } from "../workspace/WorkspaceTileRenderers";
import { renderWorkspaceWidget } from "../workspace/workspaceWidgetAdapter";
import type { WidgetRenderContext } from "../widgets/widgetRegistry";

const SettingsDrawer = lazy(() => import("../settings/SettingsDrawer").then((module) => ({ default: module.SettingsDrawer })));
const FolderModal = lazy(() => import("../modals/FolderModal").then((module) => ({ default: module.FolderModal })));
const ShortcutModal = lazy(() => import("../modals/ShortcutModal").then((module) => ({ default: module.ShortcutModal })));
const FolderPanel = lazy(() => import("../widgets/shortcut-grid/FolderPanel").then((module) => ({ default: module.FolderPanel })));

export function App() {
  const controller = useNewTabController();
  const hasHydrated = useTabStore((state) => state.hasHydrated);
  const [query, setQuery] = useState("");
  const [isCanvasEditMode, setIsCanvasEditMode] = useState(false);
  const [isWorkspacePreviewOpen, setIsWorkspacePreviewOpen] = useState(false);
  const [workspacePreviewLayout, setWorkspacePreviewLayout] = useState<WorkspaceLayout | null>(null);
  const [workspacePreviewBaseState, setWorkspacePreviewBaseState] = useState<TabState | null>(null);
  const [workspaceSaveMessage, setWorkspaceSaveMessage] = useState<string | null>(null);
  const [workspaceDragSession, setWorkspaceDragSession] = useState<WorkspaceDragSession | null>(null);
  const [outgoingDragSource, setOutgoingDragSource] = useState<DragSource | null>(null);

  useEffect(() => subscribeToExternalTabStateChanges(), []);

  const tabState = controller.tabState;
  const canvasMetrics = useCanvasMetrics(tabState.canvas.targetCellSize);
  const searchWidget = tabState.canvas.widgets.search;
  const searchSettings = searchWidget.settings;
  const theme = getThemePreset(tabState.themeId);

  const workspaceProjection = useMemo(
    () => projectTabStateToWorkspaceGrid(tabState, {
      columns: canvasMetrics.columns,
      rows: canvasMetrics.rows
    }),
    [tabState, canvasMetrics.columns, canvasMetrics.rows]
  );
  const workspaceWidgetContext: WidgetRenderContext = {
    canvasMetrics,
    controller,
    isCanvasEditMode,
    outgoingDragSource,
    query,
    setOutgoingDragSource,
    setQuery,
    tabState
  };
  const workspaceRenderers = useMemo(
    () => createWorkspaceTileRenderers({
      renderWidget: (item) => renderWorkspaceWidget(item, workspaceWidgetContext),
      onOpenFolder: (folderId) => controller.setActiveFolderId(folderId),
      onEditShortcut: (shortcut) => controller.openEditShortcutDialog(shortcut),
      showLabels: tabState.layout.showLabels
    }),
    [controller, isCanvasEditMode, outgoingDragSource, query, tabState, canvasMetrics]
  );
  const activePreviewLayout = workspacePreviewLayout ?? (workspaceProjection.ok ? workspaceProjection.layout : null);
  const workspacePages = useMemo(
    () => activePreviewLayout
      ? activePreviewLayout.pages.map((page) => ({
          id: page.id,
          label: page.id,
          items: resolveWorkspacePageItems(tabState, page.id, activePreviewLayout)
        }))
      : [],
    [activePreviewLayout, tabState]
  );

  const beginPreviewDrag = (itemId: string) => {
    if (!activePreviewLayout) return;
    setWorkspaceDragSession(beginWorkspaceDrag(activePreviewLayout, itemId as WorkspaceItemId));
  };
  const dropPreviewItem = (
    draggedItemId: string,
    targetItemId: string,
    targetPageId: string
  ) => {
    if (!activePreviewLayout || !workspaceDragSession || workspaceDragSession.itemId !== draggedItemId) return;
    const targetPage = activePreviewLayout.pages.find((page) => page.id === targetPageId);
    if (!targetPage) return;
    const targetPlacement = activePreviewLayout.placements[targetItemId as WorkspaceItemId];
    const target = updateWorkspaceDragTarget(
      workspaceDragSession,
      targetPageId,
      targetPage.itemIds.indexOf(targetItemId as WorkspaceItemId),
      targetPlacement
    );
    setWorkspacePreviewLayout(commitWorkspaceDrag(activePreviewLayout, target, {
      columns: canvasMetrics.columns,
      rows: canvasMetrics.rows
    }));
    setWorkspaceDragSession(null);
  };
  const movePreviewItemByKeyboard = (
    itemId: string,
    pageId: string,
    columnDelta: number,
    rowDelta: number
  ) => {
    if (!activePreviewLayout) return;
    setWorkspacePreviewLayout(moveWorkspaceItemByKeyboard(
      activePreviewLayout,
      pageId,
      itemId as WorkspaceItemId,
      columnDelta,
      rowDelta,
      { columns: canvasMetrics.columns, rows: canvasMetrics.rows }
    ));
  };
  const dropPreviewOnPage = (draggedItemId: string, targetPageId: string) => {
    if (!activePreviewLayout || !workspaceDragSession || workspaceDragSession.itemId !== draggedItemId) return;
    const target = updateWorkspaceDragTarget(workspaceDragSession, targetPageId, null);
    setWorkspacePreviewLayout(commitWorkspaceDrag(activePreviewLayout, target, {
      columns: canvasMetrics.columns,
      rows: canvasMetrics.rows
    }));
    setWorkspaceDragSession(null);
  };

  const saveWorkspacePreview = () => {
    if (!workspacePreviewBaseState || !activePreviewLayout) return;

    const latestState = snapshotTabState(useTabStore.getState());
    if (JSON.stringify(latestState) !== JSON.stringify(workspacePreviewBaseState)) {
      setWorkspaceSaveMessage("Saved settings changed in another tab or panel. Close and reopen the preview before saving.");
      return;
    }

    useTabStore.getState().replaceState(
      workspaceLayoutToTabState(workspacePreviewBaseState, activePreviewLayout)
    );
    setWorkspaceSaveMessage("Workspace layout saved.");
    setIsWorkspacePreviewOpen(false);
    setWorkspacePreviewLayout(null);
    setWorkspacePreviewBaseState(null);
    setWorkspaceDragSession(null);
  };

  const searchBoxHeight = Math.max(44, searchWidget.placement.height * canvasMetrics.cellHeight);
  const searchBoxRoundness = Math.min(100, Math.max(0, searchSettings.radius));
  const searchBoxRadius = (searchBoxHeight / 2) * (searchBoxRoundness / 100);

  const layoutStyle = {
    ...theme.tokens,
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

  if (!hasHydrated) {
    return <main className="new-tab loading">Loading</main>;
  }

  return (
    <main className="new-tab" data-theme={theme.id} style={layoutStyle}>
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
            className={`edit-mode-button workspace-preview-toggle${isWorkspacePreviewOpen ? " active" : ""}`}
            type="button"
            aria-pressed={isWorkspacePreviewOpen}
            onClick={() => {
              if (!isWorkspacePreviewOpen && workspaceProjection.ok) {
                setWorkspacePreviewLayout(workspaceProjection.layout);
                setWorkspacePreviewBaseState(snapshotTabState(tabState));
                setWorkspaceSaveMessage(null);
              }
              if (isWorkspacePreviewOpen) {
                setWorkspacePreviewLayout(null);
                setWorkspacePreviewBaseState(null);
                setWorkspaceSaveMessage(null);
                setWorkspaceDragSession(null);
              }
              setIsWorkspacePreviewOpen((current) => !current);
            }}
          >
            {isWorkspacePreviewOpen ? "Close preview" : "Workspace preview"}
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
        {isWorkspacePreviewOpen ? (
          <div
            className="workspace-preview-overlay"
            role="region"
            aria-label="Workspace migration preview"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              padding: 16,
              background: "var(--workspace-preview-background, rgba(15, 23, 42, 0.96))",
              color: "var(--workspace-preview-color, #f8fafc)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12 }}>
              <div>
                <strong>Workspace migration preview</strong>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Preview changes stay local until you save. Saving is blocked if the underlying state changes.
                </div>
                {workspaceSaveMessage ? <div role="status" style={{ fontSize: 12, marginTop: 4 }}>{workspaceSaveMessage}</div> : null}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={!activePreviewLayout || !workspacePreviewBaseState} onClick={saveWorkspacePreview}>
                  Save layout
                </button>
                <button type="button" onClick={() => {
                  setIsWorkspacePreviewOpen(false);
                  setWorkspacePreviewLayout(null);
                  setWorkspacePreviewBaseState(null);
                  setWorkspaceSaveMessage(null);
                  setWorkspaceDragSession(null);
                }}>
                  Close
                </button>
              </div>
            </div>
            {activePreviewLayout ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <WorkspacePager
                  pages={workspacePages}
                  columns={canvasMetrics.columns}
                  rows={canvasMetrics.rows}
                  editMode={true}
                  renderers={workspaceRenderers}
                  onItemDragStart={beginPreviewDrag}
                  onItemDragCancel={() => setWorkspaceDragSession(null)}
                  onItemDrop={dropPreviewItem}
                  onItemDropOnPage={dropPreviewOnPage}
                  onItemKeyboardMove={movePreviewItemByKeyboard}
                />
              </div>
            ) : (
              <div role="status">
                This viewport grid cannot fit the projected items without overlap. The existing layout is unchanged.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <Suspense fallback={null}>
        {controller.isSettingsDrawerOpen ? (
          <SettingsDrawer
            activeThemeId={tabState.themeId}
            backupMessage={controller.backupMessage}
            changeTheme={controller.changeTheme}
            changeWallpaperSetting={controller.changeWallpaperSetting}
            close={() => controller.setIsSettingsDrawerOpen(false)}
            exportBackup={controller.exportBackup}
            importBackup={controller.importBackup}
            resetWallpaper={controller.resetWallpaper}
            uploadWallpaper={controller.uploadWallpaper}
            wallpaper={tabState.wallpaper}
            wallpaperMessage={controller.wallpaperMessage}
          />
        ) : null}

        {controller.activeFolder ? (
          <FolderPanel
            activeFolder={controller.activeFolder}
            activeShortcutPageIndex={controller.activeShortcutPage}
            dispatchDropAction={controller.dispatchDropAction}
            onClose={() => controller.setActiveFolderId(null)}
            onEditShortcut={(shortcut) => controller.openEditShortcutDialog(shortcut, controller.activeFolder?.id ?? null)}
            onRenameFolder={controller.renameFolder}
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
      </Suspense>
    </main>
  );
}

function snapshotTabState(state: TabState): TabState {
  return structuredClone({
    schemaVersion: state.schemaVersion,
    searchProvider: state.searchProvider,
    layout: state.layout,
    themeId: state.themeId,
    canvas: state.canvas,
    wallpaper: state.wallpaper,
    tiles: state.tiles,
    pages: state.pages
  });
}
