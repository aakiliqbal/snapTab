import { describe, expect, it } from "vitest";
import { computeDropIndex, getTileIdFromKey, toDropZone } from "../../../../src/ui/drag/dragGeometry";

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
});
