import type { BrandIconId } from "./brandIcons";
import { defaultCanvasState, type CanvasState } from "./canvas";

export type SearchProviderId = "google" | "bing" | "yahoo" | "yandex" | "duckduckgo";

export type TileId = string;

export type ShortcutIcon = {
  type: "fallback" | "image" | "brand";
  label: string;
  background: string;
  imageDataUrl?: string | null;
  imageMediaId?: string | null;
  brandIconId?: BrandIconId | null;
};

export type Shortcut = {
  kind: "shortcut";
  id: TileId;
  title: string;
  url: string;
  icon: ShortcutIcon;
};

export type Folder = {
  kind: "folder";
  id: TileId;
  title: string;
  icon: {
    type: "fallback";
    label: string;
    background: string;
  };
  childIds: TileId[];
};

export type Tile = Shortcut | Folder;

export type ShortcutPage = {
  id: string;
  tileIds: TileId[];
};

export type GridLayoutPresetId = "2x4" | "2x5" | "2x6" | "2x7" | "3x3";

export type GridLayoutSettings = {
  mode: "preset" | "custom";
  presetId: GridLayoutPresetId;
  rows: number;
  columns: number;
  columnSpacing: number;
  lineSpacing: number;
  iconSize: number;
};

export type LayoutSettings = {
  iconSize: number;
  gridGap: number;
  columns: number;
  showLabels: boolean;
  searchPosition: "top" | "center";
  hideSearchBox: boolean;
  hideSearchCategory: boolean;
  hideSearchButton: boolean;
  searchBoxSize: number;
  searchBoxRadius: number;
  searchBoxOpacity: number;
  gridLayout: GridLayoutSettings;
};

export type TabState = {
  schemaVersion: 2;
  searchProvider: SearchProviderId;
  layout: LayoutSettings;
  canvas: CanvasState;
  wallpaper: {
    type: "none" | "dataUrl";
    value: string | null;
    mediaId: string | null;
    dim: number;
    blur: number;
  };
  tiles: Record<TileId, Tile>;
  pages: ShortcutPage[];
};

type LegacyShortcut = Omit<Shortcut, "kind"> & { kind?: "shortcut" };

type LegacyFolder = Omit<Folder, "kind" | "childIds"> & {
  kind?: "folder";
  quickLinks: LegacyShortcut[];
};

type LegacyTopLevelTile = {
  type: "shortcut" | "folder";
  id: string;
};

export type LegacyTabState = Omit<TabState, "schemaVersion" | "tiles" | "pages"> & {
  schemaVersion: 1;
  quickLinks: LegacyShortcut[];
  folders: LegacyFolder[];
  topLevelTiles?: LegacyTopLevelTile[];
};

export const searchProviders: Record<SearchProviderId, { label: string; url: string }> = {
  google: {
    label: "Google",
    url: "https://www.google.com/search?q="
  },
  bing: {
    label: "Bing",
    url: "https://www.bing.com/search?q="
  },
  yahoo: {
    label: "Yahoo",
    url: "https://search.yahoo.com/search?p="
  },
  yandex: {
    label: "Yandex",
    url: "https://yandex.com/search/?text="
  },
  duckduckgo: {
    label: "DuckDuckGo",
    url: "https://duckduckgo.com/?q="
  }
};

export const gridLayoutPresets: Record<GridLayoutPresetId, { label: string; rows: number; columns: number }> = {
  "2x4": { label: "2x4", rows: 2, columns: 4 },
  "2x5": { label: "2x5", rows: 2, columns: 5 },
  "2x6": { label: "2x6", rows: 2, columns: 6 },
  "2x7": { label: "2x7", rows: 2, columns: 7 },
  "3x3": { label: "3x3", rows: 3, columns: 3 }
};

const defaultLayout: LayoutSettings = {
  iconSize: 86,
  gridGap: 34,
  columns: 6,
  showLabels: true,
  searchPosition: "top",
  hideSearchBox: false,
  hideSearchCategory: false,
  hideSearchButton: false,
  searchBoxSize: 100,
  searchBoxRadius: 100,
  searchBoxOpacity: 96,
  gridLayout: {
    mode: "preset",
    presetId: "2x6",
    rows: 2,
    columns: 6,
    columnSpacing: 100,
    lineSpacing: 100,
    iconSize: 100
  }
};

const defaultWallpaper: TabState["wallpaper"] = {
  type: "none",
  value: null,
  mediaId: null,
  dim: 40,
  blur: 0
};

const defaultShortcutTiles = [
  createShortcut("docs", "Docs", "https://docs.google.com", "#4285f4", "googleDocs"),
  createShortcut("mail", "Gmail", "https://mail.google.com", "#ea4335", "gmail"),
  createShortcut("github", "GitHub", "https://github.com", "#181717", "github"),
  createShortcut("youtube", "YouTube", "https://youtube.com", "#ff0000", "youtube"),
  createShortcut("calendar", "Calendar", "https://calendar.google.com", "#4285f4", "googleCalendar"),
  createShortcut("drive", "Drive", "https://drive.google.com", "#4285f4", "googleDrive"),
  createShortcut("x", "X", "https://x.com", "#000000", "x"),
  createShortcut("spotify", "Spotify", "https://spotify.com", "#1db954", "spotify"),
  createShortcut("netflix", "Netflix", "https://netflix.com", "#e50914", "netflix"),
  createShortcut("instagram", "Instagram", "https://instagram.com", "#e4405f", "instagram"),
  createShortcut("facebook", "Facebook", "https://facebook.com", "#0866ff", "facebook"),
  createShortcut("chrome", "Chrome", "https://chrome.google.com/webstore", "#4285f4", "googleChrome"),
  createShortcut("work-notion", "Notion", "https://notion.so", "#111827", "notion"),
  createShortcut("work-reddit", "Reddit", "https://reddit.com", "#ff4500", "reddit")
];

const defaultFolder: Folder = {
  kind: "folder",
  id: "work-folder",
  title: "Work",
  icon: {
    type: "fallback",
    label: "W",
    background: "#64748b"
  },
  childIds: ["work-notion", "work-reddit"]
};

export const defaultTabState: TabState = {
  schemaVersion: 2,
  searchProvider: "google",
  layout: defaultLayout,
  canvas: defaultCanvasState,
  wallpaper: defaultWallpaper,
  tiles: Object.fromEntries([...defaultShortcutTiles, defaultFolder].map((tile) => [tile.id, tile])),
  pages: [
    {
      id: "page-1",
      tileIds: [
        "docs",
        "mail",
        "github",
        "youtube",
        "calendar",
        "drive",
        "x",
        "spotify",
        "netflix",
        "instagram",
        "facebook",
        "chrome",
        "work-folder"
      ]
    }
  ]
};

export function createShortcut(
  id: string,
  title: string,
  url: string,
  background: string,
  brandIconId?: BrandIconId
): Shortcut {
  return {
    kind: "shortcut",
    id,
    title,
    url,
    icon: {
      type: brandIconId ? "brand" : "fallback",
      label: title.slice(0, 1).toUpperCase(),
      background,
      imageMediaId: null,
      brandIconId: brandIconId ?? null
    }
  };
}

export function migrateLegacyTabState(value: Partial<LegacyTabState> | null | undefined): TabState {
  if (!value) {
    return defaultTabState;
  }

  const legacyShortcuts = Array.isArray(value.quickLinks) ? value.quickLinks : [];
  const legacyFolders = Array.isArray(value.folders) ? value.folders : [];
  const tiles: Record<TileId, Tile> = {};

  for (const shortcut of legacyShortcuts) {
    if (isLegacyShortcut(shortcut)) {
      tiles[shortcut.id] = toShortcut(shortcut);
    }
  }

  for (const folder of legacyFolders) {
    if (!isLegacyFolder(folder)) {
      continue;
    }

    const childIds: TileId[] = [];
    for (const child of folder.quickLinks) {
      if (!isLegacyShortcut(child)) {
        continue;
      }

      const shortcut = toShortcut(child);
      tiles[shortcut.id] = shortcut;
      childIds.push(shortcut.id);
    }

    tiles[folder.id] = {
      kind: "folder",
      id: folder.id,
      title: folder.title,
      icon: folder.icon,
      childIds
    };
  }

  const tileIds = normalizeLegacyTopLevelTileIds(value.topLevelTiles, legacyShortcuts, legacyFolders, tiles);

  return normalizeTabState({
    ...defaultTabState,
    ...value,
    schemaVersion: 2,
    layout: {
      ...defaultTabState.layout,
      ...(value.layout ?? {}),
      gridLayout: normalizeGridLayout(value.layout?.gridLayout, value.layout)
    },
    canvas: normalizeCanvasState(value.canvas, value),
    wallpaper: {
      ...defaultTabState.wallpaper,
      ...(value.wallpaper ?? {})
    },
    tiles,
    pages: [{ id: "page-1", tileIds }]
  });
}

export function normalizeTabState(value: Partial<TabState>): TabState {
  const tiles = isRecord(value.tiles) ? normalizeTiles(value.tiles) : defaultTabState.tiles;
  const pages = normalizeShortcutPages(value.pages, tiles);

  return {
    ...defaultTabState,
    ...value,
    schemaVersion: 2,
    searchProvider: isSearchProviderId(value.searchProvider) ? value.searchProvider : defaultTabState.searchProvider,
    layout: {
      ...defaultTabState.layout,
      ...(value.layout ?? {}),
      gridLayout: normalizeGridLayout(value.layout?.gridLayout, value.layout)
    },
    canvas: normalizeCanvasState(value.canvas, value),
    wallpaper: {
      ...defaultTabState.wallpaper,
      ...(value.wallpaper ?? {})
    },
    tiles,
    pages
  };
}

export function normalizeCanvasState(value: unknown, fallbackState?: Partial<TabState> | Partial<LegacyTabState>): CanvasState {
  const fallback = defaultTabState.canvas;
  const legacyLayout = fallbackState?.layout;
  const legacySearchProvider = isSearchProviderId(fallbackState?.searchProvider)
    ? fallbackState.searchProvider
    : fallback.widgets.search.settings.searchProvider;

  if (!isRecord(value)) {
    return {
      ...fallback,
      widgets: {
        search: {
          ...fallback.widgets.search,
          enabled: legacyLayout?.hideSearchBox === true ? false : fallback.widgets.search.enabled,
          settings: {
            ...fallback.widgets.search.settings,
            searchProvider: legacySearchProvider,
            showProviderTabs: legacyLayout?.hideSearchCategory === true ? false : fallback.widgets.search.settings.showProviderTabs,
            showSearchMark: legacyLayout?.hideSearchButton === true ? false : fallback.widgets.search.settings.showSearchMark,
            opacity: clampInteger(legacyLayout?.searchBoxOpacity, 0, 100, fallback.widgets.search.settings.opacity),
            radius: clampInteger(legacyLayout?.searchBoxRadius, 0, 100, fallback.widgets.search.settings.radius)
          }
        },
        shortcutGrid: {
          ...fallback.widgets.shortcutGrid,
          settings: {
            ...fallback.widgets.shortcutGrid.settings,
            iconSize: clampInteger(legacyLayout?.gridLayout?.iconSize, 50, 120, fallback.widgets.shortcutGrid.settings.iconSize),
            columnSpacing: clampInteger(
              legacyLayout?.gridLayout?.columnSpacing,
              0,
              100,
              fallback.widgets.shortcutGrid.settings.columnSpacing
            ),
            lineSpacing: clampInteger(
              legacyLayout?.gridLayout?.lineSpacing,
              0,
              100,
              fallback.widgets.shortcutGrid.settings.lineSpacing
            ),
            showLabels: legacyLayout?.showLabels ?? fallback.widgets.shortcutGrid.settings.showLabels
          }
        }
      }
    };
  }

  const widgets = isRecord(value.widgets) ? value.widgets : {};
  return {
    targetCellSize: clampInteger(value.targetCellSize, 48, 72, fallback.targetCellSize),
    widgets: {
      search: normalizeSearchWidget(widgets.search, fallback.widgets.search, legacySearchProvider),
      shortcutGrid: normalizeShortcutGridWidget(widgets.shortcutGrid, fallback.widgets.shortcutGrid)
    }
  };
}

function normalizeSearchWidget(
  value: unknown,
  fallback: CanvasState["widgets"]["search"],
  fallbackSearchProvider: SearchProviderId
): CanvasState["widgets"]["search"] {
  if (!isRecord(value)) {
    return fallback;
  }

  const settings = isRecord(value.settings) ? value.settings : {};
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
    placement: normalizeWidgetPlacement(value.placement, fallback.placement),
    settings: {
      ...fallback.settings,
      searchProvider: isSearchProviderId(settings.searchProvider) ? settings.searchProvider : fallbackSearchProvider,
      showProviderTabs:
        typeof settings.showProviderTabs === "boolean" ? settings.showProviderTabs : fallback.settings.showProviderTabs,
      showSearchMark: typeof settings.showSearchMark === "boolean" ? settings.showSearchMark : fallback.settings.showSearchMark,
      opacity: clampInteger(settings.opacity, 0, 100, fallback.settings.opacity),
      radius: clampInteger(settings.radius, 0, 100, fallback.settings.radius),
      visual: normalizeWidgetVisualSettings(settings.visual, fallback.settings.visual)
    }
  };
}

function normalizeShortcutGridWidget(
  value: unknown,
  fallback: CanvasState["widgets"]["shortcutGrid"]
): CanvasState["widgets"]["shortcutGrid"] {
  if (!isRecord(value)) {
    return fallback;
  }

  const settings = isRecord(value.settings) ? value.settings : {};
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
    placement: normalizeWidgetPlacement(value.placement, fallback.placement),
    settings: {
      ...fallback.settings,
      iconSize: clampInteger(settings.iconSize, 50, 120, fallback.settings.iconSize),
      columnSpacing: clampInteger(settings.columnSpacing, 0, 100, fallback.settings.columnSpacing),
      lineSpacing: clampInteger(settings.lineSpacing, 0, 100, fallback.settings.lineSpacing),
      showLabels: typeof settings.showLabels === "boolean" ? settings.showLabels : fallback.settings.showLabels,
      showPageDots: typeof settings.showPageDots === "boolean" ? settings.showPageDots : fallback.settings.showPageDots,
      visual: normalizeWidgetVisualSettings(settings.visual, fallback.settings.visual)
    }
  };
}

function normalizeWidgetPlacement(value: unknown, fallback: CanvasState["widgets"]["search"]["placement"]) {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    x: clampInteger(value.x, 0, 80, fallback.x),
    y: clampInteger(value.y, 0, 80, fallback.y),
    width: clampInteger(value.width, 1, 80, fallback.width),
    height: clampInteger(value.height, 1, 80, fallback.height),
    zIndex: clampInteger(value.zIndex, 0, 100, fallback.zIndex)
  };
}

function normalizeWidgetVisualSettings(value: unknown, fallback: CanvasState["widgets"]["search"]["settings"]["visual"]) {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    showBackground: typeof value.showBackground === "boolean" ? value.showBackground : fallback.showBackground,
    backgroundColor: typeof value.backgroundColor === "string" ? value.backgroundColor : fallback.backgroundColor,
    backgroundOpacity: clampInteger(value.backgroundOpacity, 0, 100, fallback.backgroundOpacity),
    showBorder: typeof value.showBorder === "boolean" ? value.showBorder : fallback.showBorder,
    borderColor: typeof value.borderColor === "string" ? value.borderColor : fallback.borderColor,
    borderOpacity: clampInteger(value.borderOpacity, 0, 100, fallback.borderOpacity),
    radius: clampInteger(value.radius, 0, 40, fallback.radius),
    shadow: clampInteger(value.shadow, 0, 60, fallback.shadow),
    padding: clampInteger(value.padding, 0, 40, fallback.padding)
  };
}

export function normalizeShortcutPages(value: unknown, tiles: Record<TileId, Tile>): ShortcutPage[] {
  const topLevelTileIds = new Set(
    Object.values(tiles)
      .filter((tile) => !isFolderChild(tile.id, tiles))
      .map((tile) => tile.id)
  );
  const seen = new Set<TileId>();
  const seenPageIds = new Set<string>();
  const pages: ShortcutPage[] = [];

  if (Array.isArray(value)) {
    for (const [index, page] of value.entries()) {
      if (!isRecord(page) || !Array.isArray(page.tileIds)) {
        continue;
      }

      const tileIds = page.tileIds.filter((tileId): tileId is string => {
        if (typeof tileId !== "string" || seen.has(tileId) || !topLevelTileIds.has(tileId)) {
          return false;
        }

        seen.add(tileId);
        return true;
      });

      pages.push({ id: getUniquePageId(page.id, index, seenPageIds), tileIds });
    }
  }

  for (const tileId of topLevelTileIds) {
    if (!seen.has(tileId)) {
      if (pages.length === 0) {
        pages.push({ id: "page-1", tileIds: [] });
      }
      pages[pages.length - 1].tileIds.push(tileId);
    }
  }

  return compactShortcutPages(pages);
}

export function compactShortcutPages(pages: ShortcutPage[]): ShortcutPage[] {
  const compacted = pages.filter((page) => page.tileIds.length > 0);
  return compacted.length > 0 ? compacted : [{ id: "page-1", tileIds: [] }];
}

export function normalizeGridLayout(value: unknown, fallbackLayout?: Partial<LayoutSettings>): GridLayoutSettings {
  const fallback = defaultTabState.layout.gridLayout;

  if (!isRecord(value)) {
    return {
      ...fallback,
      columns: clampInteger(fallbackLayout?.columns, 1, 8, fallback.columns),
      columnSpacing: clampInteger(
        fallbackLayout?.gridGap ? Math.round((fallbackLayout.gridGap / defaultTabState.layout.gridGap) * 100) : undefined,
        0,
        100,
        fallback.columnSpacing
      ),
      lineSpacing: clampInteger(
        fallbackLayout?.gridGap ? Math.round((fallbackLayout.gridGap / defaultTabState.layout.gridGap) * 100) : undefined,
        0,
        100,
        fallback.lineSpacing
      ),
      iconSize: clampInteger(
        fallbackLayout?.iconSize ? Math.round((fallbackLayout.iconSize / defaultTabState.layout.iconSize) * 100) : undefined,
        50,
        120,
        fallback.iconSize
      )
    };
  }

  const presetId = isGridLayoutPresetId(value.presetId) ? value.presetId : fallback.presetId;
  const preset = gridLayoutPresets[presetId];
  const mode = value.mode === "custom" ? "custom" : "preset";

  return {
    mode,
    presetId,
    rows: clampInteger(value.rows, 1, 8, preset.rows),
    columns: clampInteger(value.columns, 1, 8, preset.columns),
    columnSpacing: clampInteger(value.columnSpacing, 0, 100, fallback.columnSpacing),
    lineSpacing: clampInteger(value.lineSpacing, 0, 100, fallback.lineSpacing),
    iconSize: clampInteger(value.iconSize, 50, 120, fallback.iconSize)
  };
}

function normalizeLegacyTopLevelTileIds(
  value: unknown,
  shortcuts: LegacyShortcut[],
  folders: LegacyFolder[],
  tiles: Record<TileId, Tile>
) {
  const shortcutIds = new Set(shortcuts.map((shortcut) => shortcut.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const seen = new Set<TileId>();
  const tileIds: TileId[] = [];

  if (Array.isArray(value)) {
    for (const tile of value) {
      if (!isLegacyTopLevelTile(tile)) {
        continue;
      }

      const exists = tile.type === "shortcut" ? shortcutIds.has(tile.id) : folderIds.has(tile.id);
      if (!exists || !tiles[tile.id] || seen.has(tile.id)) {
        continue;
      }

      seen.add(tile.id);
      tileIds.push(tile.id);
    }
  }

  for (const shortcut of shortcuts) {
    if (tiles[shortcut.id] && !seen.has(shortcut.id)) {
      seen.add(shortcut.id);
      tileIds.push(shortcut.id);
    }
  }

  for (const folder of folders) {
    if (tiles[folder.id] && !seen.has(folder.id)) {
      seen.add(folder.id);
      tileIds.push(folder.id);
    }
  }

  return tileIds;
}

function normalizeTiles(value: Record<string, unknown>): Record<TileId, Tile> {
  const tiles: Record<TileId, Tile> = {};

  for (const [id, tile] of Object.entries(value)) {
    if (!isRecord(tile) || tile.id !== id) {
      continue;
    }

    if (tile.kind === "shortcut" && typeof tile.title === "string" && typeof tile.url === "string" && isRecord(tile.icon)) {
      tiles[id] = tile as Shortcut;
    }

    if (tile.kind === "folder" && typeof tile.title === "string" && isRecord(tile.icon) && Array.isArray(tile.childIds)) {
      tiles[id] = {
        ...(tile as Folder),
        childIds: uniqueStrings(tile.childIds)
      };
    }
  }

  normalizeFolderChildren(tiles);

  return Object.keys(tiles).length > 0 ? tiles : defaultTabState.tiles;
}

function normalizeFolderChildren(tiles: Record<TileId, Tile>) {
  for (const [id, tile] of Object.entries(tiles)) {
    if (tile.kind !== "folder") {
      continue;
    }

    tile.childIds = tile.childIds.filter((childId) => tiles[childId]?.kind === "shortcut");
    if (tile.childIds.length < 2) {
      delete tiles[id];
    }
  }
}

function uniqueStrings(value: unknown[]) {
  const seen = new Set<string>();
  return value.filter((item): item is string => {
    if (typeof item !== "string" || seen.has(item)) {
      return false;
    }

    seen.add(item);
    return true;
  });
}

function getUniquePageId(value: unknown, index: number, seenPageIds: Set<string>) {
  const requestedId = typeof value === "string" && value.trim() ? value : `page-${index + 1}`;
  if (!seenPageIds.has(requestedId)) {
    seenPageIds.add(requestedId);
    return requestedId;
  }

  let nextIndex = index + 1;
  let nextId = `page-${nextIndex}`;
  while (seenPageIds.has(nextId)) {
    nextIndex += 1;
    nextId = `page-${nextIndex}`;
  }

  seenPageIds.add(nextId);
  return nextId;
}

function isFolderChild(tileId: TileId, tiles: Record<TileId, Tile>) {
  return Object.values(tiles).some((tile) => tile.kind === "folder" && tile.childIds.includes(tileId));
}

function toShortcut(shortcut: LegacyShortcut): Shortcut {
  return {
    ...shortcut,
    kind: "shortcut"
  };
}

function isLegacyShortcut(value: unknown): value is LegacyShortcut {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    isRecord(value.icon)
  );
}

function isLegacyFolder(value: unknown): value is LegacyFolder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isRecord(value.icon) &&
    Array.isArray(value.quickLinks)
  );
}

function isLegacyTopLevelTile(value: unknown): value is LegacyTopLevelTile {
  return (
    isRecord(value) &&
    (value.type === "shortcut" || value.type === "folder") &&
    typeof value.id === "string"
  );
}

function isSearchProviderId(value: unknown): value is SearchProviderId {
  return typeof value === "string" && value in searchProviders;
}

function isGridLayoutPresetId(value: unknown): value is GridLayoutPresetId {
  return typeof value === "string" && value in gridLayoutPresets;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
