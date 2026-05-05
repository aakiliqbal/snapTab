import { useEffect, useState, type RefObject } from "react";
import type { GridLayoutSettings } from "../../domain/tabState";

type ShortcutGridMetrics = {
  maxFittedIconSize: number;
  fittedLabelSize: number;
  fittedTileGap: number;
};

const defaultMetrics: ShortcutGridMetrics = {
  maxFittedIconSize: 104,
  fittedLabelSize: 16,
  fittedTileGap: 12
};

export function useShortcutGridMetrics(
  gridRef: RefObject<HTMLElement | null>,
  gridLayout: GridLayoutSettings,
  showLabels: boolean,
  activeShortcutPageIndex: number
): ShortcutGridMetrics {
  const [metrics, setMetrics] = useState(defaultMetrics);

  useEffect(() => {
    function measure() {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      const gridBounds = grid.getBoundingClientRect();
      const gridStyles = window.getComputedStyle(grid);
      const columnGap = parseFloat(gridStyles.columnGap) || 0;
      const rowGap = parseFloat(gridStyles.rowGap) || 0;
      const paddingTop = parseFloat(gridStyles.paddingTop) || 0;
      const rowHeight =
        (gridBounds.height - paddingTop - rowGap * Math.max(0, gridLayout.rows - 1)) / gridLayout.rows;
      const labelSize = showLabels ? Math.max(10, Math.min(16, Math.floor(rowHeight * 0.24))) : 0;
      const tileGap = showLabels ? Math.max(3, Math.min(12, Math.floor(rowHeight * 0.08))) : 0;
      const labelHeight = showLabels ? Math.ceil(labelSize * 1.2) : 0;
      const widthAvailable =
        (gridBounds.width - columnGap * Math.max(0, gridLayout.columns - 1)) / gridLayout.columns;
      const heightAvailable = rowHeight - labelHeight - tileGap;

      setMetrics({
        fittedLabelSize: labelSize,
        fittedTileGap: tileGap,
        maxFittedIconSize: Math.max(18, Math.floor(Math.min(104, widthAvailable, heightAvailable)))
      });
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.documentElement);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    activeShortcutPageIndex,
    gridLayout.columns,
    gridLayout.columnSpacing,
    gridLayout.lineSpacing,
    gridLayout.rows,
    gridRef,
    showLabels
  ]);

  return metrics;
}
