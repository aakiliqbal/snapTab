import type { DropZone } from "../../domain/dropActions";
import type { DropPosition } from "./dragModel";

export type { DropPosition };

export type Point = {
  x: number;
  y: number;
};

export type Shift = {
  x: number;
  y: number;
};

export type PageEdgeDirection = "prev" | "next";

export const emptyShift: Shift = { x: 0, y: 0 };

export function getPageEdgeDirection(clientX: number, viewportWidth: number, pageCount: number): PageEdgeDirection | null {
  if (pageCount <= 1 || viewportWidth <= 0) {
    return null;
  }

  const edgeWidth = Math.min(viewportWidth * 0.1, 130);
  if (clientX <= edgeWidth) {
    return "prev";
  }

  if (clientX >= viewportWidth - edgeWidth) {
    return "next";
  }

  return null;
}

export function getDropPosition(clientX: number, rect: DOMRect): DropPosition {
  const relativeX = (clientX - rect.left) / rect.width;

  if (relativeX < 0.3) return "left";
  if (relativeX > 0.7) return "right";
  return "center";
}

export function computeDropIndex(sourceIndex: number, targetIndex: number, position: Exclude<DropPosition, "center">) {
  if (sourceIndex < targetIndex) {
    return position === "right" ? targetIndex : targetIndex - 1;
  }

  return position === "right" ? targetIndex + 1 : targetIndex;
}

export function getTileIdFromKey(key: string) {
  return key.includes(":") ? key.split(":").slice(1).join(":") : key;
}

export function toDropZone(position: DropPosition): DropZone {
  if (position === "left") {
    return "leading";
  }

  if (position === "right") {
    return "trailing";
  }

  return "center";
}

export function getShiftBetweenRects(from: DOMRect | undefined, to: DOMRect | undefined): Shift {
  if (!from || !to) {
    return emptyShift;
  }

  return {
    x: to.left - from.left,
    y: to.top - from.top
  };
}

export function captureTileRects(root: HTMLElement | null, selector = ".quick-link") {
  const rects: Record<string, DOMRect> = {};

  if (!root) {
    return rects;
  }

  root.querySelectorAll(selector).forEach((element) => {
    const key = element.getAttribute("data-tile-key");
    if (key) {
      rects[key] = element.getBoundingClientRect();
    }
  });

  return rects;
}
