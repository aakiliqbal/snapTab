import type { CSSProperties, ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";

export type WorkspacePageSurfaceProps = {
  items: ResolvedWorkspaceItem[];
  columns: number;
  rows: number;
  editMode: boolean;
  renderItem: (item: ResolvedWorkspaceItem) => ReactNode;
  onItemDragStart?: (itemId: ResolvedWorkspaceItem["id"]) => void;
  onItemDrop?: (draggedItemId: ResolvedWorkspaceItem["id"], targetItemId: ResolvedWorkspaceItem["id"]) => void;
  onItemDropOnPage?: (draggedItemId: ResolvedWorkspaceItem["id"]) => void;
  onItemKeyboardMove?: (itemId: ResolvedWorkspaceItem["id"], columnDelta: number, rowDelta: number) => void;
};

/**
 * Generic shared page surface. It knows placement and item identity only;
 * widget/shortcut/folder behavior stays in the registered item renderer.
 *
 * Kept separate from CanvasSurface during migration so the legacy layout can
 * continue running until all item actions have adapters.
 */
export function WorkspacePageSurface({
  columns,
  editMode,
  items,
  renderItem,
  rows,
  onItemDragStart,
  onItemDrop,
  onItemDropOnPage,
  onItemKeyboardMove
}: WorkspacePageSurfaceProps) {
  return (
    <section
      aria-label="Launcher workspace"
      className={`workspace-page-surface${editMode ? " editing" : ""}`}
      onDragOver={(event) => {
        if (editMode && onItemDropOnPage) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!editMode || !onItemDropOnPage) return;
        event.preventDefault();
        const draggedItemId = event.dataTransfer.getData("text/plain");
        if (draggedItemId) onItemDropOnPage(draggedItemId as ResolvedWorkspaceItem["id"]);
      }}
      style={{
        "--workspace-columns": columns,
        "--workspace-rows": rows,
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0
      } as CSSProperties}
    >
      {items.map((item) => (
        <div
          className="workspace-page-item"
          data-workspace-item-id={item.id}
          key={item.id}
          draggable={editMode && Boolean(onItemDragStart)}
          tabIndex={editMode && onItemKeyboardMove ? 0 : undefined}
          aria-label={editMode && onItemKeyboardMove ? `Workspace item ${item.id}. Use arrow keys to move.` : undefined}
          onKeyDown={(event) => {
            if (!editMode || !onItemKeyboardMove || event.target !== event.currentTarget) return;
            const delta: [number, number] | null = event.key === "ArrowLeft" ? [-1, 0]
              : event.key === "ArrowRight" ? [1, 0]
              : event.key === "ArrowUp" ? [0, -1]
              : event.key === "ArrowDown" ? [0, 1]
              : null;
            if (!delta) return;
            event.preventDefault();
            onItemKeyboardMove(item.id, delta[0], delta[1]);
          }}
          onPointerDown={(event) => {
            // Mouse drag stays on native HTML DnD; pointer handling is for touch/pen
            // so the two event paths cannot commit the same gesture twice.
            if (!editMode || !onItemDragStart || event.button !== 0 || event.pointerType === "mouse") return;
            const target = event.target;
            if (target instanceof Element && target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.pointerDragging = "true";
            event.currentTarget.dataset.pointerStartX = String(event.clientX);
            event.currentTarget.dataset.pointerStartY = String(event.clientY);
            onItemDragStart(item.id);
          }}
          onPointerUp={(event) => {
            if (!editMode || event.currentTarget.dataset.pointerDragging !== "true") return;
            delete event.currentTarget.dataset.pointerDragging;
            const startX = Number(event.currentTarget.dataset.pointerStartX);
            const startY = Number(event.currentTarget.dataset.pointerStartY);
            delete event.currentTarget.dataset.pointerStartX;
            delete event.currentTarget.dataset.pointerStartY;
            if (Math.hypot(event.clientX - startX, event.clientY - startY) < 8) {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              return;
            }
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            const hit = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY);
            const targetItem = hit?.closest<HTMLElement>("[data-workspace-item-id]");
            const draggedId = item.id;
            if (targetItem?.dataset.workspaceItemId) {
              if (targetItem.dataset.workspaceItemId !== draggedId) {
                onItemDrop?.(draggedId, targetItem.dataset.workspaceItemId as ResolvedWorkspaceItem["id"]);
              }
            } else if (hit?.closest(".workspace-page-surface")) {
              onItemDropOnPage?.(draggedId);
            }
          }}
          onPointerCancel={(event) => {
            delete event.currentTarget.dataset.pointerDragging;
            delete event.currentTarget.dataset.pointerStartX;
            delete event.currentTarget.dataset.pointerStartY;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onDragStart={(event) => {
            if (!editMode || !onItemDragStart) return;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id);
            onItemDragStart(item.id);
          }}
          onDragOver={(event) => {
            if (editMode && onItemDrop) event.preventDefault();
          }}
          onDrop={(event) => {
            if (!editMode || !onItemDrop) return;
            event.preventDefault();
            event.stopPropagation();
            const draggedItemId = event.dataTransfer.getData("text/plain");
            if (draggedItemId && draggedItemId !== item.id) onItemDrop(draggedItemId as ResolvedWorkspaceItem["id"], item.id);
          }}
          style={{
            gridColumn: `${item.placement.column + 1} / span ${item.placement.columnSpan}`,
            gridRow: `${item.placement.row + 1} / span ${item.placement.rowSpan}`,
            zIndex: item.placement.zIndex,
            cursor: editMode && onItemDragStart ? "grab" : undefined,
            touchAction: editMode && onItemDragStart ? "none" : undefined
          }}
        >
          {renderItem(item)}
        </div>
      ))}
    </section>
  );
}
