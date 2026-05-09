import type { SearchProviderId } from "./tabState";

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
      placement: { x: 7, y: 3, width: 20, height: 1, zIndex: 10 },
      settings: {
        searchProvider: "google",
        showProviderTabs: true,
        showSearchMark: true,
        opacity: 96,
        radius: 100,
        visual: defaultWidgetVisualSettings
      }
    },
    shortcutGrid: {
      enabled: true,
      placement: { x: 4, y: 6, width: 26, height: 10, zIndex: 5 },
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

export function snapPlacementToGrid(placement: WidgetPlacement): WidgetPlacement {
  return {
    x: Math.round(placement.x),
    y: Math.round(placement.y),
    width: Math.max(1, Math.round(placement.width)),
    height: Math.max(1, Math.round(placement.height)),
    zIndex: Math.round(placement.zIndex)
  };
}

export function clampPlacementToCanvas(placement: WidgetPlacement, grid: CanvasGrid): WidgetPlacement {
  const snapped = snapPlacementToGrid(placement);
  const width = Math.min(Math.max(1, snapped.width), grid.columns);
  const height = Math.min(Math.max(1, snapped.height), grid.rows);
  return {
    ...snapped,
    x: Math.min(Math.max(0, snapped.x), Math.max(0, grid.columns - width)),
    y: Math.min(Math.max(0, snapped.y), Math.max(0, grid.rows - height)),
    width,
    height
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
