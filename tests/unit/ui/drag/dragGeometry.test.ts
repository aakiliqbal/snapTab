import { describe, expect, it } from "vitest";
import {
  computeDropIndex,
  getHorizontalGridPageEdgeDirection,
  getPageEdgeDirection,
  getTileIdFromKey,
  toDropZone
} from "../../../../src/ui/drag/dragGeometry";

describe("dragGeometry", () => {
  it("converts tile keys to ids", () => {
    expect(getTileIdFromKey("shortcut:abc:def")).toBe("abc:def");
    expect(getTileIdFromKey("abc")).toBe("abc");
  });

  it("computes insertion indexes around the dragged source", () => {
    expect(computeDropIndex(0, 3, "right")).toBe(3);
    expect(computeDropIndex(0, 3, "left")).toBe(2);
    expect(computeDropIndex(3, 0, "right")).toBe(1);
    expect(computeDropIndex(3, 0, "left")).toBe(0);
  });

  it("maps UI positions to domain drop zones", () => {
    expect(toDropZone("left")).toBe("leading");
    expect(toDropZone("center")).toBe("center");
    expect(toDropZone("right")).toBe("trailing");
  });

  it("detects page edge drag zones", () => {
    expect(getPageEdgeDirection(80, 1000, 2)).toBe("prev");
    expect(getPageEdgeDirection(920, 1000, 2)).toBe("next");
    expect(getPageEdgeDirection(500, 1000, 2)).toBeNull();
    expect(getPageEdgeDirection(10, 1000, 1)).toBeNull();
  });

  it("caps page edge zones at reference width", () => {
    expect(getPageEdgeDirection(129, 2000, 2)).toBe("prev");
    expect(getPageEdgeDirection(131, 2000, 2)).toBeNull();
    expect(getPageEdgeDirection(1871, 2000, 2)).toBe("next");
    expect(getPageEdgeDirection(1869, 2000, 2)).toBeNull();
  });

  it("detects grid page edges only inside grid vertical band", () => {
    const rect = { left: 300, right: 900, top: 200, bottom: 500 };

    expect(getHorizontalGridPageEdgeDirection(250, 250, rect, 2, 100)).toBe("prev");
    expect(getHorizontalGridPageEdgeDirection(950, 250, rect, 2, 100)).toBe("next");
    expect(getHorizontalGridPageEdgeDirection(250, 150, rect, 2, 100)).toBeNull();
    expect(getHorizontalGridPageEdgeDirection(950, 550, rect, 2, 100)).toBeNull();
    expect(getHorizontalGridPageEdgeDirection(250, 250, rect, 1, 100)).toBeNull();
  });
});
