import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { produce } from "immer";
import { useShallow } from "zustand/react/shallow";
import { findBrandIconRecommendations, type BrandIcon } from "../../domain/brandIcons";
import { type FolderEditDraft, type ShortcutDraft } from "../../domain/drafts";
import {
  describeBackupReplacement,
  getBackupImportErrorMessage,
  parseTabStateBackup
} from "../../domain/backup";
import {
  searchProviders,
  type Folder,
  type Shortcut,
  type SearchProviderId,
  type TabState
} from "../../domain/tabState";
import type { ThemeId } from "../../domain/themes";
import {
  applyRecommendedIcon,
  createShortcutFromDraft,
  deleteFolderFromState,
  deleteShortcutFromState,
  getShortcutPageIndex,
  updateFolder,
  updateFolderFromDraft,
  resolveActiveFolder,
  resolveTopLevelTiles,
  upsertShortcut
} from "../../domain/tabOperations";
import { applyDropAction, type DropAction } from "../../domain/dropActions";
import {
  type CanvasGrid,
  type DateTimeWidgetSettings,
  type RssWidgetSettings,
  type SearchWidgetSettings,
  type ShortcutGridWidgetSettings,
  type WeatherWidgetSettings,
  type WidgetId,
  type WidgetPlacement,
  findNearestFreePlacement,
  resolveWidgetPlacement
} from "../../domain/canvas";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { useTabStore } from "../../stores/useTabStore";

export function useNewTabController() {
  const tabState = useTabStore(
    useShallow(
      (state): TabState => ({
        canvas: state.canvas,
        layout: state.layout,
        pages: state.pages,
        schemaVersion: state.schemaVersion,
        searchProvider: state.searchProvider,
        themeId: state.themeId,
        tiles: state.tiles,
        wallpaper: state.wallpaper
      })
    )
  );
  const replaceTabState = useTabStore((state) => state.replaceState);
  const updateTabState = useTabStore((state) => state.updateState);
  const setLayout = useTabStore((state) => state.setLayout);
  const setSearchProvider = useTabStore((state) => state.setSearchProvider);
  const setTheme = useTabStore((state) => state.setTheme);
  const setWallpaper = useTabStore((state) => state.setWallpaper);
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutDraft | null>(null);
  const [folderDraft, setFolderDraft] = useState<FolderEditDraft | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [wallpaperMessage, setWallpaperMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [activeShortcutPage, setActiveShortcutPage] = useState(0);
  const gridRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function closeOverlays(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsSettingsDrawerOpen(false);
      setShortcutDraft(null);
      setFolderDraft(null);
      setActiveFolderId(null);
    }

    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, []);

  const activeSearchProvider = useMemo(() => {
    return searchProviders[tabState.canvas.widgets.search.settings.searchProvider];
  }, [tabState.canvas.widgets.search.settings.searchProvider]);

  const topLevelTiles = useMemo(() => resolveTopLevelTiles(tabState), [tabState.pages, tabState.tiles]);
  const hasOverlayOpen = isSettingsDrawerOpen || shortcutDraft !== null || folderDraft !== null || activeFolderId !== null;
  const activeFolder = useMemo(() => resolveActiveFolder(tabState, activeFolderId), [activeFolderId, tabState.tiles]);
  const shortcutIconRecommendations = useMemo(
    () => (shortcutDraft ? findBrandIconRecommendations(shortcutDraft.title, shortcutDraft.url) : []),
    [shortcutDraft?.title, shortcutDraft?.url]
  );

  function persistState(nextState: TabState) {
    replaceTabState(nextState);
  }

  function moveToTilePage(nextState: TabState, type: "shortcut" | "folder", id: string) {
    const pageIndex = getShortcutPageIndex(nextState, id);
    if (pageIndex >= 0) {
      setActiveShortcutPage(pageIndex);
    }
  }

  function changeSearchProvider(providerId: SearchProviderId) {
    setSearchProvider(providerId);
  }

  function updateWidgetPlacement(widgetId: WidgetId, placement: WidgetPlacement, grid: CanvasGrid) {
    updateTabState((state) =>
      produce(state, (draft) => {
        const widget = draft.canvas.widgets[widgetId];
        const nextPlacement = widgetId === "search" ? { ...placement, height: 1 } : placement;
        // Placement validation stays in the domain so Canvas UI cannot persist overlap or out-of-bounds Widgets.
        widget.placement = resolveWidgetPlacement(nextPlacement, grid, draft.canvas.widgets, widgetId, widget.placement);
      })
    );
  }

  function setWidgetEnabled(widgetId: WidgetId, enabled: boolean, grid?: CanvasGrid) {
    updateTabState((state) =>
      produce(state, (draft) => {
        const widget = draft.canvas.widgets[widgetId];
        if (enabled && grid) {
          // Re-enabling a Widget may need a nearby free slot because disabled Widgets do not reserve Canvas space.
          const nextPlacement = findNearestFreePlacement(widget.placement, grid, draft.canvas.widgets, widgetId);
          if (nextPlacement) {
            widget.placement = nextPlacement;
          }
        }

        widget.enabled = enabled;
      })
    );
  }

  function changeSearchWidgetSetting<K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.search.settings[key] = value;
        if (key === "searchProvider") {
          // Keep the legacy top-level provider mirror in sync for persisted-state compatibility.
          draft.searchProvider = value as SearchProviderId;
        }
      })
    );
  }

  function changeShortcutGridWidgetSetting<K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K],
    grid?: CanvasGrid & { cellWidth: number; cellHeight: number }
  ) {
    updateTabState((state) =>
      produce(state, (draft) => {
        const widget = draft.canvas.widgets.shortcutGrid;
        const previousSettings = widget.settings;
        widget.settings[key] = value;

        if (key === "iconSize" && typeof value === "number" && grid) {
          const currentWidth = widget.placement.width * grid.cellWidth;
          const currentHeight = widget.placement.height * grid.cellHeight;
          const previousScale = previousSettings.iconSize / 100;
          const nextScale = value / 100;
          const previousTileWidth = Math.max(84, 86 * previousScale + 30);
          const previousTileHeight = Math.max(84, 86 * previousScale + (previousSettings.showLabels ? 42 : 18));
          const columns = Math.max(1, Math.floor(currentWidth / previousTileWidth));
          const rows = Math.max(1, Math.floor((currentHeight - 56) / previousTileHeight));
          const nextTileWidth = Math.max(84, 86 * nextScale + 30);
          const nextTileHeight = Math.max(84, 86 * nextScale + (widget.settings.showLabels ? 42 : 18));
          const nextPlacement = {
            ...widget.placement,
            width: Math.max(widget.placement.width, Math.ceil((columns * nextTileWidth) / grid.cellWidth)),
            height: Math.max(widget.placement.height, Math.ceil((rows * nextTileHeight + 56) / grid.cellHeight))
          };

          widget.placement = resolveWidgetPlacement(nextPlacement, grid, draft.canvas.widgets, "shortcutGrid", widget.placement);
        }
      })
    );
  }

  function changeWeatherWidgetSetting<K extends keyof WeatherWidgetSettings>(key: K, value: WeatherWidgetSettings[K]) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.weather.settings[key] = value;
      })
    );
  }

  function changeWeatherWidgetSettings(settings: Partial<WeatherWidgetSettings>) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.weather.settings = {
          ...draft.canvas.widgets.weather.settings,
          ...settings
        };
      })
    );
  }

  function changeDateTimeWidgetSetting<K extends keyof DateTimeWidgetSettings>(key: K, value: DateTimeWidgetSettings[K]) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.dateTime.settings[key] = value;
      })
    );
  }

  function changeRssWidgetSetting<K extends keyof RssWidgetSettings>(key: K, value: RssWidgetSettings[K]) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.rss.settings[key] = value;
      })
    );
  }

  function changeRssWidgetSettings(settings: Partial<RssWidgetSettings>) {
    updateTabState((state) =>
      produce(state, (draft) => {
        draft.canvas.widgets.rss.settings = {
          ...draft.canvas.widgets.rss.settings,
          ...settings
        };
      })
    );
  }

  function changeLayout<K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) {
    setLayout(key, value);
  }

  function changeTheme(themeId: ThemeId) {
    setTheme(themeId);
  }

  function renameFolder(folderId: string, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    updateTabState((state) =>
      produce(state, (draft) => {
        const folder = draft.tiles[folderId];
        if (folder?.kind !== "folder") {
          return;
        }

        folder.title = trimmedTitle;
        folder.icon.label = (trimmedTitle.slice(0, 1) || "?").toUpperCase();
      })
    );
  }

  function openEditShortcutDialog(shortcut: Shortcut, folderId: string | null = null) {
    setShortcutDraft({
      id: shortcut.id,
      folderId,
      title: shortcut.title,
      url: shortcut.url,
      iconLabel: shortcut.icon.label,
      iconBackground: shortcut.icon.background,
      iconImageDataUrl: shortcut.icon.imageDataUrl ?? null,
      iconMediaId: shortcut.icon.imageMediaId ?? null,
      brandIconId: shortcut.icon.brandIconId ?? null
    });
  }

  function openEditFolderDialog(folder: Folder) {
    setFolderDraft({
      id: folder.id,
      title: folder.title,
      iconLabel: folder.icon.label,
      iconBackground: folder.icon.background
    });
  }

  function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!shortcutDraft) {
      return;
    }

    const nextShortcut = createShortcutFromDraft(shortcutDraft);
    if (!nextShortcut) {
      return;
    }

    const nextState = upsertShortcut(tabState, nextShortcut, shortcutDraft);
    persistState(nextState);
    if (!shortcutDraft.id && !shortcutDraft.folderId) {
      moveToTilePage(nextState, "shortcut", nextShortcut.id);
    }
    setShortcutDraft(null);
  }

  function deleteShortcut() {
    if (!shortcutDraft?.id) {
      return;
    }

    persistState(deleteShortcutFromState(tabState, shortcutDraft));
    setShortcutDraft(null);
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!folderDraft) {
      return;
    }

    const nextFolder = updateFolderFromDraft(tabState, folderDraft);
    if (!nextFolder) {
      return;
    }

    const nextState = updateFolder(tabState, nextFolder);
    persistState(nextState);
    setFolderDraft(null);
  }

  async function deleteFolder() {
    if (!folderDraft?.id) {
      return;
    }

    persistState(deleteFolderFromState(tabState, folderDraft.id));

    if (activeFolderId === folderDraft.id) {
      setActiveFolderId(null);
    }

    setFolderDraft(null);
  }

  function dispatchDropAction(action: DropAction) {
    updateTabState((state) =>
      produce(state, (draft) => {
        applyDropAction(draft, action);
      })
    );
  }

  async function uploadWallpaper(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setWallpaperMessage("Choose an image file.");
      return;
    }

    try {
      setWallpaperMessage("Saving wallpaper...");
      const wallpaperDataUrl = await readFileAsDataUrl(file);
      setWallpaper({
        ...tabState.wallpaper,
        type: "dataUrl",
        value: wallpaperDataUrl
      });
      setWallpaperMessage("Wallpaper saved.");
    } catch {
      setWallpaperMessage("Could not save. Try a smaller image or GIF.");
    }
  }

  async function uploadShortcutIcon(file: File | null) {
    if (!file || !shortcutDraft) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const iconDataUrl = await readFileAsDataUrl(file);
    setShortcutDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            iconImageDataUrl: iconDataUrl,
            iconMediaId: currentDraft.iconMediaId,
            brandIconId: null
          }
        : currentDraft
    );
  }

  function chooseRecommendedIcon(icon: BrandIcon) {
    if (!shortcutDraft) {
      return;
    }

    setShortcutDraft(applyRecommendedIcon(shortcutDraft, icon));
  }

  function resetWallpaper() {
    setWallpaper({
      type: "none",
      value: null,
      mediaId: null,
      dim: tabState.wallpaper.dim,
      blur: tabState.wallpaper.blur
    });
    setWallpaperMessage("Wallpaper reset.");
  }

  async function changeWallpaperSetting(key: "dim" | "blur", value: number) {
    setWallpaper({
      ...tabState.wallpaper,
      [key]: value
    });
  }

  function exportBackup() {
    const backupBlob = new Blob([JSON.stringify(tabState, null, 2)], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(backupBlob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `snaptab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setBackupMessage("Backup exported.");
  }

  async function importBackup(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const backupText = await file.text();
      const parsedBackup = JSON.parse(backupText) as unknown;
      const nextState = parseTabStateBackup(parsedBackup);
      const shouldReplace = window.confirm(`${describeBackupReplacement(nextState)} Continue?`);

      if (!shouldReplace) {
        setBackupMessage("Import cancelled.");
        return;
      }

      persistState(nextState);
      setActiveFolderId(null);
      setShortcutDraft(null);
      setFolderDraft(null);
      setBackupMessage("Backup imported.");
    } catch (error) {
      setBackupMessage(getBackupImportErrorMessage(error));
    }
  }

  return {
    activeFolder,
    activeFolderId,
    activeSearchProvider,
    activeShortcutPage,
    backupMessage,
    changeLayout,
    changeDateTimeWidgetSetting,
    changeRssWidgetSetting,
    changeRssWidgetSettings,
    changeSearchProvider,
    changeSearchWidgetSetting,
    changeWeatherWidgetSetting,
    changeShortcutGridWidgetSetting,
    changeTheme,
    changeWallpaperSetting,
    changeWeatherWidgetSettings,
    chooseRecommendedIcon,
    deleteFolder,
    deleteShortcut,
    dispatchDropAction,
    exportBackup,
    folderDraft,
    gridRef,
    hasOverlayOpen,
    importBackup,
    isSettingsDrawerOpen,
    openEditFolderDialog,
    openEditShortcutDialog,
    shortcutDraft,
    shortcutIconRecommendations,
    resetWallpaper,
    renameFolder,
    saveFolder,
    saveShortcut,
    setActiveFolderId,
    setActiveShortcutPage,
    setBackupMessage,
    setFolderDraft,
    setIsSettingsDrawerOpen,
    setShortcutDraft,
    setWidgetEnabled,
    tabState,
    topLevelTiles,
    uploadShortcutIcon,
    updateWidgetPlacement,
    uploadWallpaper,
    wallpaperMessage
  };
}
