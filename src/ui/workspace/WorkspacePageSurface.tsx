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
  onItemDropOnPage
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
            cursor: editMode && onItemDragStart ? "grab" : undefined
          }}
        >
          {renderItem(item)}
        </div>
      ))}
    </section>
  );
}
