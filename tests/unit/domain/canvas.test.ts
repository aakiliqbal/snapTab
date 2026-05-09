import { describe, expect, it } from "vitest";
import {
  clampPlacementToCanvas,
  defaultCanvasState,
  deriveCanvasGrid,
  doPlacementsOverlap,
  doesPlacementOverlap,
  findNearestFreePlacement,
  isPlacementInsideCanvas,
  resolveWidgetPlacement,
  snapPlacementToGrid
} from "../../../src/domain/canvas";

describe("canvas placement", () => {
  it("derives square-ish grid dimensions from viewport size", () => {
    expect(deriveCanvasGrid(1920, 1080)).toEqual({ columns: 34, rows: 19 });
  });

  it("snaps fractional placement to grid units", () => {
    expect(snapPlacementToGrid({ x: 2.4, y: 3.6, width: 8.4, height: 1.2, zIndex: 4.8 })).toEqual({
      x: 2,
      y: 4,
      width: 8,
      height: 1,
      zIndex: 5
    });
  });

  it("clamps placement inside the canvas", () => {
    expect(clampPlacementToCanvas({ x: 30, y: 18, width: 8, height: 4, zIndex: 1 }, { columns: 34, rows: 19 })).toEqual({
      x: 26,
      y: 15,
      width: 8,
      height: 4,
      zIndex: 1
    });
  });

  it("detects bounds and overlap against enabled widgets only", () => {
    const widgets = {
      ...defaultCanvasState.widgets,
      search: {
        ...defaultCanvasState.widgets.search,
        enabled: false
      }
    };

    expect(isPlacementInsideCanvas({ x: 0, y: 0, width: 2, height: 2, zIndex: 1 }, { columns: 4, rows: 4 })).toBe(true);
    expect(isPlacementInsideCanvas({ x: 3, y: 3, width: 2, height: 2, zIndex: 1 }, { columns: 4, rows: 4 })).toBe(false);
    expect(doesPlacementOverlap(defaultCanvasState.widgets.search.placement, widgets, "shortcutGrid")).toBe(false);
  });

  it("rejects overlapping placement and keeps fallback", () => {
    const fallback = { x: 0, y: 0, width: 4, height: 2, zIndex: 1 };
    const resolved = resolveWidgetPlacement(
      defaultCanvasState.widgets.shortcutGrid.placement,
      { columns: 34, rows: 19 },
      defaultCanvasState.widgets,
      "search",
      fallback
    );

    expect(resolved).toEqual(fallback);
  });

  it("finds nearest free placement when a disabled widget is re-enabled", () => {
    const widgets = {
      ...defaultCanvasState.widgets,
      search: {
        ...defaultCanvasState.widgets.search,
        enabled: false
      }
    };

    const placement = findNearestFreePlacement(
      { x: 4, y: 6, width: 4, height: 2, zIndex: 10 },
      { columns: 34, rows: 19 },
      widgets,
      "search"
    );

    expect(placement).not.toBeNull();
    expect(doPlacementsOverlap(placement!, defaultCanvasState.widgets.shortcutGrid.placement)).toBe(false);
  });
});
