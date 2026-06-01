import type { SearchProviderId, SearchVerticalId } from "./tabState";

export type WidgetId = "search" | "shortcutGrid";

export type WidgetPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type WidgetVisualSettings = {
  showBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  showBorder: boolean;
  borderColor: string;
  borderOpacity: number;
  radius: number;
  shadow: number;
  padding: number;
};

export type SearchWidgetSettings = {
  searchProvider: SearchProviderId;
  searchVertical: SearchVerticalId;
  showProviderTabs: boolean;
  showSearchMark: boolean;
  opacity: number;
  radius: number;
  visual: WidgetVisualSettings;
};

export type ShortcutGridWidgetSettings = {
  iconSize: number;
  columnSpacing: number;
  lineSpacing: number;
  showLabels: boolean;
  showPageDots: boolean;
  visual: WidgetVisualSettings;
};

export type WidgetState<TSettings> = {
  enabled: boolean;
  placement: WidgetPlacement;
  settings: TSettings;
};

export type CanvasWidgets = {
  search: WidgetState<SearchWidgetSettings>;
  shortcutGrid: WidgetState<ShortcutGridWidgetSettings>;
};

export type CanvasState = {
  targetCellSize: number;
  widgets: CanvasWidgets;
};

export type CanvasGrid = {
  columns: number;
  rows: number;
};

const fallbackCanvasGrid: CanvasGrid = { columns: 34, rows: 19 };
const searchTopMargin = 2;
const widgetGap = 2;
const canvasBottomMargin = 1;
const defaultSearchSize = { width: 11, height: 1 };
const defaultShortcutGridSize = { width: 13, height: 7 };

export const defaultWidgetVisualSettings: WidgetVisualSettings = {
  showBackground: false,
  backgroundColor: "#0f172a",
  backgroundOpacity: 34,
  showBorder: false,
  borderColor: "#ffffff",
  borderOpacity: 18,
  radius: 18,
  shadow: 18,
  padding: 0
};

export const defaultCanvasState: CanvasState = {
  targetCellSize: 56,
  widgets: {
    search: {
      enabled: true,
      placement: deriveDefaultWidgetPlacements(fallbackCanvasGrid).search,
      settings: {
        searchProvider: "google",
        searchVertical: "web",
        showProviderTabs: true,
        showSearchMark: true,
        opacity: 96,
        radius: 100,
        visual: defaultWidgetVisualSettings
      }
    },
    shortcutGrid: {
      enabled: true,
      placement: deriveDefaultWidgetPlacements(fallbackCanvasGrid).shortcutGrid,
      settings: {
        iconSize: 100,
        columnSpacing: 100,
        lineSpacing: 100,
        showLabels: true,
        showPageDots: true,
        visual: defaultWidgetVisualSettings
      }
    }
  }
};

export function deriveCanvasGrid(width: number, height: number, targetCellSize = defaultCanvasState.targetCellSize): CanvasGrid {
  const columns = Math.max(1, Math.floor(width / targetCellSize));
  const rows = Math.max(1, Math.floor(height / targetCellSize));
  return { columns, rows };
}

export function deriveDefaultWidgetPlacements(grid: CanvasGrid): Record<WidgetId, WidgetPlacement> {
  const searchWidth = Math.min(defaultSearchSize.width, grid.columns);
  const searchHeight = Math.min(defaultSearchSize.height, grid.rows);
  const searchPlacement = clampPlacementToCanvas(
    {
      x: centerOffset(grid.columns, searchWidth),
      y: Math.min(searchTopMargin, Math.max(0, grid.rows - searchHeight)),
      width: searchWidth,
      height: searchHeight,
      zIndex: 10
    },
    grid
  );
  const shortcutGridY = searchPlacement.y + searchPlacement.height + widgetGap;
  const shortcutGridWidth = Math.min(defaultShortcutGridSize.width, grid.columns);
  const availableShortcutGridHeight = Math.max(1, grid.rows - shortcutGridY - canvasBottomMargin);
  const shortcutGridHeight = Math.min(defaultShortcutGridSize.height, availableShortcutGridHeight);

  return {
    search: searchPlacement,
    shortcutGrid: clampPlacementToCanvas(
      {
        x: centerOffset(grid.columns, shortcutGridWidth),
        y: shortcutGridY,
        width: shortcutGridWidth,
        height: shortcutGridHeight,
        zIndex: 5
      },
      grid
    )
  };
}

export function resolveResponsiveDefaultWidgetPlacement(
  widgetId: WidgetId,
  placement: WidgetPlacement,
  grid: CanvasGrid
): WidgetPlacement {
  if (!isKnownDefaultWidgetPlacement(widgetId, placement)) {
    return placement;
  }

  return deriveDefaultWidgetPlacements(grid)[widgetId];
}

export function clampPlacementToCanvas(placement: WidgetPlacement, grid: CanvasGrid): WidgetPlacement {
  const width = Math.min(Math.max(1, placement.width), grid.columns);
  const height = Math.min(Math.max(1, placement.height), grid.rows);
  return {
    ...placement,
    x: Math.min(Math.max(0, placement.x), Math.max(0, grid.columns - width)),
    y: Math.min(Math.max(0, placement.y), Math.max(0, grid.rows - height)),
    width,
    height,
    zIndex: Math.round(placement.zIndex)
  };
}

export function isPlacementInsideCanvas(placement: WidgetPlacement, grid: CanvasGrid): boolean {
  return (
    placement.x >= 0 &&
    placement.y >= 0 &&
    placement.width >= 1 &&
    placement.height >= 1 &&
    placement.x + placement.width <= grid.columns &&
    placement.y + placement.height <= grid.rows
  );
}

export function doPlacementsOverlap(first: WidgetPlacement, second: WidgetPlacement): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

export function doesPlacementOverlap(
  placement: WidgetPlacement,
  widgets: CanvasWidgets,
  ignoreWidgetId: WidgetId | null = null
): boolean {
  return (Object.entries(widgets) as Array<[WidgetId, CanvasWidgets[WidgetId]]>).some(([id, widget]) => {
    if (id === ignoreWidgetId || !widget.enabled) {
      return false;
    }

    return doPlacementsOverlap(placement, widget.placement);
  });
}

export function resolveWidgetPlacement(
  placement: WidgetPlacement,
  grid: CanvasGrid,
  widgets: CanvasWidgets,
  widgetId: WidgetId,
  fallback: WidgetPlacement
): WidgetPlacement {
  const clamped = clampPlacementToCanvas(placement, grid);
  if (!doesPlacementOverlap(clamped, widgets, widgetId)) {
    return clamped;
  }

  return clampPlacementToCanvas(fallback, grid);
}

export function findNearestFreePlacement(
  preferred: WidgetPlacement,
  grid: CanvasGrid,
  widgets: CanvasWidgets,
  widgetId: WidgetId
): WidgetPlacement | null {
  const size = clampPlacementToCanvas(preferred, grid);
  const candidates: WidgetPlacement[] = [];

  for (let y = 0; y <= grid.rows - size.height; y += 1) {
    for (let x = 0; x <= grid.columns - size.width; x += 1) {
      candidates.push({ ...size, x, y });
    }
  }

  candidates.sort((a, b) => distance(a, preferred) - distance(b, preferred));
  return candidates.find((candidate) => !doesPlacementOverlap(candidate, widgets, widgetId)) ?? null;
}

function distance(first: WidgetPlacement, second: WidgetPlacement) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
}

function centerOffset(available: number, size: number) {
  return Math.max(0, (available - size) / 2);
}

function isKnownDefaultWidgetPlacement(widgetId: WidgetId, placement: WidgetPlacement) {
  const fallbackDefaults = deriveDefaultWidgetPlacements(fallbackCanvasGrid);
  const knownDefaults: Record<WidgetId, WidgetPlacement[]> = {
    search: [
      fallbackDefaults.search,
      { x: 8, y: 2, width: 11, height: 1, zIndex: 10 },
      { x: 8, y: 2, width: 11, height: 2, zIndex: 10 },
      { x: 7, y: 3, width: 20, height: 1, zIndex: 10 },
      { x: 10, y: 3, width: 14, height: 1, zIndex: 10 }
    ],
    shortcutGrid: [
      fallbackDefaults.shortcutGrid,
      { x: 7, y: 5, width: 13, height: 7, zIndex: 5 },
      { x: 4, y: 6, width: 26, height: 10, zIndex: 5 },
      { x: 12.5, y: 5.5, width: 9, height: 8, zIndex: 5 }
    ]
  };

  return knownDefaults[widgetId].some((knownPlacement) => placementsMatch(placement, knownPlacement));
}

function placementsMatch(first: WidgetPlacement, second: WidgetPlacement) {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height &&
    first.zIndex === second.zIndex
  );
}
