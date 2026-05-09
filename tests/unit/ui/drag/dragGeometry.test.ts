import { describe, expect, it } from "vitest";
import { computeDropIndex, getPageEdgeDirection, getTileIdFromKey, toDropZone } from "../../../../src/ui/drag/dragGeometry";

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
});
