import { type CSSProperties, type ReactNode } from "react";
import type { CanvasGrid } from "../../domain/canvas";

type CanvasMetrics = CanvasGrid & {
  cellWidth: number;
  cellHeight: number;
};

type CanvasSurfaceProps = {
  children: ReactNode;
  editMode: boolean;
  metrics: CanvasMetrics;
  onCanvasContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
};

export function CanvasSurface({ children, editMode, metrics, onCanvasContextMenu }: CanvasSurfaceProps) {
  const style = {
    "--canvas-columns": metrics.columns,
    "--canvas-rows": metrics.rows,
    "--canvas-cell-width": `${metrics.cellWidth}px`,
    "--canvas-cell-height": `${metrics.cellHeight}px`
  } as CSSProperties;

  return (
    <section
      className={`canvas-surface${editMode ? " editing" : ""}`}
      aria-label="Canvas"
      onContextMenu={onCanvasContextMenu}
      style={style}
    >
      {children}
    </section>
  );
}
