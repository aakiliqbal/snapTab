import type { CSSProperties, ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";

export type WorkspacePageSurfaceProps = {
  items: ResolvedWorkspaceItem[];
  columns: number;
  rows: number;
  editMode: boolean;
  renderItem: (item: ResolvedWorkspaceItem) => ReactNode;
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
  rows
}: WorkspacePageSurfaceProps) {
  return (
    <section
      aria-label="Launcher workspace"
      className={`workspace-page-surface${editMode ? " editing" : ""}`}
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
          style={{
            gridColumn: `${item.placement.column + 1} / span ${item.placement.columnSpan}`,
            gridRow: `${item.placement.row + 1} / span ${item.placement.rowSpan}`,
            zIndex: item.placement.zIndex
          }}
        >
          {renderItem(item)}
        </div>
      ))}
    </section>
  );
}
