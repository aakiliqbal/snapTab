import { describe, expect, it } from "vitest";
import {
  clampPlacementToCanvas,
  defaultCanvasState,
  deriveDefaultWidgetPlacements,
  deriveCanvasGrid,
  doPlacementsOverlap,
  doesPlacementOverlap,
  findNearestFreePlacement,
  isPlacementInsideCanvas,
  resolveResponsiveDefaultWidgetPlacement,
  resolveWidgetPlacement
} from "../../../src/domain/canvas";

describe("canvas placement", () => {
  it("derives square-ish grid dimensions from viewport size", () => {
    expect(deriveCanvasGrid(1920, 1080)).toEqual({ columns: 34, rows: 19 });
  });

  it("derives centered default Widget placements from Canvas size", () => {
    expect(deriveDefaultWidgetPlacements({ columns: 34, rows: 19 })).toEqual({
      search: { x: 11.5, y: 2, width: 11, height: 1, zIndex: 10 },
      shortcutGrid: { x: 10.5, y: 5, width: 13, height: 7, zIndex: 5 }
    });

    expect(deriveDefaultWidgetPlacements({ columns: 20, rows: 12 })).toEqual({
      search: { x: 4.5, y: 2, width: 11, height: 1, zIndex: 10 },
      shortcutGrid: { x: 3.5, y: 5, width: 13, height: 6, zIndex: 5 }
    });
  });

  it("resolves only known default placements responsively", () => {
    expect(
      resolveResponsiveDefaultWidgetPlacement("search", { x: 8, y: 2, width: 11, height: 2, zIndex: 10 }, { columns: 20, rows: 12 })
    ).toEqual({ x: 4.5, y: 2, width: 11, height: 1, zIndex: 10 });

    const customPlacement = { x: 2, y: 4, width: 11, height: 1, zIndex: 10 };
    expect(resolveResponsiveDefaultWidgetPlacement("search", customPlacement, { columns: 20, rows: 12 })).toBe(customPlacement);
  });

  it("keeps fractional placement while clamping inside the canvas", () => {
    expect(clampPlacementToCanvas({ x: 30.25, y: 18.5, width: 8.4, height: 4.2, zIndex: 1.2 }, { columns: 34, rows: 19 })).toEqual({
      x: 25.6,
      y: 14.8,
      width: 8.4,
      height: 4.2,
      zIndex: 1
    });
  });

  it("clamps oversized placement to canvas size", () => {
    expect(clampPlacementToCanvas({ x: 30, y: 18, width: 80, height: 40, zIndex: 1 }, { columns: 34, rows: 19 })).toEqual({
      x: 0,
      y: 0,
      width: 34,
      height: 19,
      zIndex: 1
    });
  });

  it("clamps integer placement inside the canvas", () => {
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
