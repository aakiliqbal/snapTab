// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspacePageSurface } from "../../../src/ui/workspace/WorkspacePageSurface";

const item = (id: string): ResolvedWorkspaceItem => ({
  kind: "shortcut",
  id: `tile:${id}`,
  tileId: id,
  tile: {
    kind: "shortcut",
    id,
    title: id,
    url: "https://example.com",
    icon: { type: "fallback", label: id.slice(0, 1), background: "#123456" }
  },
  placement: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 }
});

let container: HTMLDivElement;
let root: Root;
const originalElementFromPoint = document.elementFromPoint;

function pointerEvent(type: string, options: { pointerId?: number; pointerType?: string; button?: number; clientX?: number; clientY?: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({
    pointerId: options.pointerId ?? 1,
    pointerType: options.pointerType ?? "touch",
    button: options.button ?? 0,
    clientX: options.clientX ?? 10,
    clientY: options.clientY ?? 10
  })) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

describe("WorkspacePageSurface pointer interactions", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.elementFromPoint = originalElementFromPoint;
    vi.restoreAllMocks();
  });

  it("cancels a touch tap without committing a drop", () => {
    const onItemDragStart = vi.fn();
    const onItemDragCancel = vi.fn();
    const onItemDrop = vi.fn();
    const onItemDropOnPage = vi.fn();

    act(() => {
      root.render(createElement(WorkspacePageSurface, {
        columns: 4,
        rows: 3,
        editMode: true,
        items: [item("docs")],
        renderItem: (resolved) => createElement("span", null, resolved.id),
        onItemDragStart,
        onItemDragCancel,
        onItemDrop,
        onItemDropOnPage
      }));
    });

    const source = container.querySelector<HTMLElement>('[data-workspace-item-id="tile:docs"]')!;
    act(() => source.dispatchEvent(pointerEvent("pointerdown", { clientX: 10, clientY: 10 })));
    act(() => source.dispatchEvent(pointerEvent("pointerup", { clientX: 12, clientY: 11 })));

    expect(onItemDragStart).toHaveBeenCalledWith("tile:docs");
    expect(onItemDragCancel).toHaveBeenCalledOnce();
    expect(onItemDrop).not.toHaveBeenCalled();
    expect(onItemDropOnPage).not.toHaveBeenCalled();
  });

  it("drops a touch drag onto the item under the pointer", () => {
    const onItemDragStart = vi.fn();
    const onItemDragCancel = vi.fn();
    const onItemDrop = vi.fn();
    const onItemDropOnPage = vi.fn();

    act(() => {
      root.render(createElement(WorkspacePageSurface, {
        columns: 4,
        rows: 3,
        editMode: true,
        items: [item("docs"), item("mail")],
        renderItem: (resolved) => createElement("span", null, resolved.id),
        onItemDragStart,
        onItemDragCancel,
        onItemDrop,
        onItemDropOnPage
      }));
    });

    const source = container.querySelector<HTMLElement>('[data-workspace-item-id="tile:docs"]')!;
    const target = container.querySelector<HTMLElement>('[data-workspace-item-id="tile:mail"]')!;
    document.elementFromPoint = vi.fn(() => target);

    act(() => source.dispatchEvent(pointerEvent("pointerdown", { clientX: 10, clientY: 10 })));
    act(() => source.dispatchEvent(pointerEvent("pointerup", { clientX: 40, clientY: 40 })));

    expect(onItemDrop).toHaveBeenCalledWith("tile:docs", "tile:mail");
    expect(onItemDragCancel).not.toHaveBeenCalled();
    expect(onItemDropOnPage).not.toHaveBeenCalled();
  });

  it("routes a touch drop on an adjacent-page target to that page", () => {
    const onItemDragStart = vi.fn();
    const onItemDropOnTargetPage = vi.fn();

    act(() => {
      root.render(createElement(WorkspacePageSurface, {
        columns: 4,
        rows: 3,
        editMode: true,
        items: [item("docs")],
        renderItem: (resolved) => createElement("span", null, resolved.id),
        onItemDragStart,
        onItemDropOnTargetPage
      }));
    });

    const source = container.querySelector<HTMLElement>('[data-workspace-item-id="tile:docs"]')!;
    const nextPageTarget = document.createElement("button");
    nextPageTarget.dataset.workspaceDropPageId = "work";
    document.body.appendChild(nextPageTarget);
    document.elementFromPoint = vi.fn(() => nextPageTarget);

    act(() => source.dispatchEvent(pointerEvent("pointerdown", { clientX: 10, clientY: 10 })));
    act(() => source.dispatchEvent(pointerEvent("pointerup", { clientX: 40, clientY: 40 })));

    expect(onItemDropOnTargetPage).toHaveBeenCalledWith("tile:docs", "work");
    nextPageTarget.remove();
  });

  it("clears the drag session when the browser cancels the pointer", () => {
    const onItemDragCancel = vi.fn();

    act(() => {
      root.render(createElement(WorkspacePageSurface, {
        columns: 4,
        rows: 3,
        editMode: true,
        items: [item("docs")],
        renderItem: (resolved) => createElement("span", null, resolved.id),
        onItemDragStart: vi.fn(),
        onItemDragCancel
      }));
    });

    const source = container.querySelector<HTMLElement>('[data-workspace-item-id="tile:docs"]')!;
    act(() => source.dispatchEvent(pointerEvent("pointerdown", {})));
    act(() => source.dispatchEvent(pointerEvent("pointercancel", {})));

    expect(onItemDragCancel).toHaveBeenCalledOnce();
    expect(source.dataset.pointerDragging).toBeUndefined();
  });
});
