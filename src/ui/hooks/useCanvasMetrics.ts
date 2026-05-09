import { useEffect, useState } from "react";
import { deriveCanvasGrid, type CanvasGrid } from "../../domain/canvas";

type CanvasMetrics = CanvasGrid & {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
};

const fallbackMetrics: CanvasMetrics = {
  width: 1920,
  height: 1080,
  columns: 34,
  rows: 19,
  cellWidth: 56,
  cellHeight: 56
};

export function useCanvasMetrics(targetCellSize: number): CanvasMetrics {
  const [metrics, setMetrics] = useState(fallbackMetrics);

  useEffect(() => {
    function measure() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const grid = deriveCanvasGrid(width, height, targetCellSize);
      setMetrics({
        ...grid,
        width,
        height,
        cellWidth: width / grid.columns,
        cellHeight: height / grid.rows
      });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [targetCellSize]);

  return metrics;
}
