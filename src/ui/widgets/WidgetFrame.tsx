import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { CanvasGrid, WidgetId, WidgetPlacement } from "../../domain/canvas";

type CanvasMetrics = CanvasGrid & {
  cellWidth: number;
  cellHeight: number;
};

type WidgetFrameProps = {
  children: ReactNode;
  editMode: boolean;
  enabled: boolean;
  label: string;
  metrics: CanvasMetrics;
  onMove: (placement: WidgetPlacement) => void;
  onResize: (placement: WidgetPlacement) => void;
  placement: WidgetPlacement;
  centerSnapAxes?: CenterSnapAxes;
  resizeAxis?: "both" | "horizontal";
  onWidgetContextMenu?: (widgetId: WidgetId, event: React.MouseEvent<HTMLElement>) => void;
  widgetId: WidgetId;
};

type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type CenterSnapAxes = { x: boolean; y: boolean };

type AlignmentGuide = {
  axis: "x" | "y";
  label: string;
  position: number;
};

export function WidgetFrame({
  children,
  centerSnapAxes = { x: true, y: true },
  editMode,
  enabled,
  label,
  metrics,
  onMove,
  onResize,
  onWidgetContextMenu,
  placement,
  resizeAxis = "both",
  widgetId
}: WidgetFrameProps) {
  const [displayPlacement, setDisplayPlacement] = useState(placement);
  const [isInteracting, setIsInteracting] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const activePointerCleanupRef = useRef<(() => void) | null>(null);
  const contentHeight = useMeasuredContentHeight(contentRef, editMode, metrics.cellHeight, metrics.cellWidth);
  const { flushPersist, schedulePersist } = useDebouncedPlacementPersistence();

  useEffect(() => {
    setDisplayPlacement(placement);
  }, [placement]);

  useEffect(() => {
    return () => {
      activePointerCleanupRef.current?.();
    };
  }, []);

  if (!enabled && !editMode) {
    return null;
  }

  const style = {
    left: `${displayPlacement.x * metrics.cellWidth}px`,
    top: `${displayPlacement.y * metrics.cellHeight}px`,
    width: `${displayPlacement.width * metrics.cellWidth}px`,
    height: `${Math.max(displayPlacement.height * metrics.cellHeight, contentHeight ?? 0)}px`,
    zIndex: displayPlacement.zIndex
  } as CSSProperties;
  const alignmentGuides = isInteracting ? getAlignmentGuides(displayPlacement, metrics, centerSnapAxes) : [];
  const cornerLabel = getCornerLabel(alignmentGuides);

  function startMove(event: React.PointerEvent<HTMLElement>) {
    if (!editMode || event.button !== 0) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = placement;
    setIsInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerCleanupRef.current?.();

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPlacement = snapPlacementToCenterGuides(
        clampDisplayPlacement({
          ...startPlacement,
          x: startPlacement.x + (moveEvent.clientX - startX) / metrics.cellWidth,
          y: startPlacement.y + (moveEvent.clientY - startY) / metrics.cellHeight
        }, metrics),
        metrics,
        centerSnapAxes
      );
      setDisplayPlacement(nextPlacement);
      schedulePersist(nextPlacement, onMove);
    }

    function cleanupPointerListeners() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      activePointerCleanupRef.current = null;
    }

    function handlePointerUp() {
      cleanupPointerListeners();
      setIsInteracting(false);
      flushPersist(onMove);
    }

    activePointerCleanupRef.current = cleanupPointerListeners;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    if (!editMode || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    const direction = event.currentTarget.dataset.resizeDirection as ResizeDirection;
    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = placement;
    setIsInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerCleanupRef.current?.();

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPlacement = snapPlacementToCenterGuides(
        resizePlacement(startPlacement, direction, resizeAxis, {
          dx: (moveEvent.clientX - startX) / metrics.cellWidth,
          dy: (moveEvent.clientY - startY) / metrics.cellHeight,
          metrics
        }),
        metrics,
        {
          x: centerSnapAxes.x && (direction.includes("e") || direction.includes("w")),
          y: centerSnapAxes.y && resizeAxis === "both" && (direction.includes("n") || direction.includes("s"))
        }
      );
      setDisplayPlacement(nextPlacement);
      schedulePersist(nextPlacement, onResize);
    }

    function cleanupPointerListeners() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      activePointerCleanupRef.current = null;
    }

    function handlePointerUp() {
      cleanupPointerListeners();
      setIsInteracting(false);
      flushPersist(onResize);
    }

    activePointerCleanupRef.current = cleanupPointerListeners;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <>
      {alignmentGuides.map((guide) => (
        <div
          className={`canvas-alignment-guide ${guide.axis === "x" ? "vertical" : "horizontal"}`}
          key={`${guide.axis}-${guide.label}`}
          style={guide.axis === "x" ? { left: guide.position } : { top: guide.position }}
        >
          <span>{guide.label}</span>
        </div>
      ))}
      {cornerLabel ? <div className="canvas-corner-guide-label">{cornerLabel}</div> : null}
      <article
        className={`widget-frame${editMode ? " editing" : ""}${enabled ? "" : " disabled"}`}
        data-widget-id={widgetId}
        onContextMenu={(event) => onWidgetContextMenu?.(widgetId, event)}
        onPointerDown={startMove}
        style={style}
      >
        {editMode ? <div className="widget-frame-label">{label}</div> : null}
        <div className="widget-frame-content" ref={contentRef}>{children}</div>
        {editMode
          ? getResizeDirections(resizeAxis).map((direction) => (
              <button
                aria-label={`Resize ${label} ${direction}`}
                className={`widget-resize-handle resize-${direction}`}
                data-resize-direction={direction}
                key={direction}
                onPointerDown={startResize}
                type="button"
              />
            ))
          : null}
      </article>
    </>
  );
}

function useMeasuredContentHeight(
  ref: RefObject<HTMLElement | null>,
  editMode: boolean,
  cellHeight: number,
  cellWidth: number
) {
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const contentElement = ref.current;
    if (!contentElement) {
      setContentHeight(null);
      return;
    }
    const measuredContent = contentElement;

    function measure() {
      setContentHeight(Math.ceil(measuredContent.scrollHeight));
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(measuredContent);
    return () => resizeObserver.disconnect();
  }, [cellHeight, cellWidth, editMode, ref]);

  return contentHeight;
}

function useDebouncedPlacementPersistence() {
  const pendingPlacementRef = useRef<WidgetPlacement | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPersist = useCallback((persist: (placement: WidgetPlacement) => void) => {
    // Pointer-up must persist the final placement even if the debounce timer has not fired yet.
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    if (pendingPlacementRef.current) {
      persist(pendingPlacementRef.current);
      pendingPlacementRef.current = null;
    }
  }, []);

  const schedulePersist = useCallback((nextPlacement: WidgetPlacement, persist: (placement: WidgetPlacement) => void) => {
    // Keep pointer movement visually immediate, but avoid writing every pointermove to persisted state.
    pendingPlacementRef.current = nextPlacement;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = setTimeout(() => {
      if (pendingPlacementRef.current) {
        persist(pendingPlacementRef.current);
        pendingPlacementRef.current = null;
      }
      persistTimerRef.current = null;
    }, 180);
  }, []);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  return { flushPersist, schedulePersist };
}

function getResizeDirections(resizeAxis: WidgetFrameProps["resizeAxis"]): ResizeDirection[] {
  if (resizeAxis === "horizontal") {
    return ["e", "w", "ne", "se", "sw", "nw"];
  }

  return ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
}

function resizePlacement(
  placement: WidgetPlacement,
  direction: ResizeDirection,
  resizeAxis: WidgetFrameProps["resizeAxis"],
  options: { dx: number; dy: number; metrics: CanvasMetrics }
): WidgetPlacement {
  const changesWidthFromWest = direction.includes("w");
  const changesWidthFromEast = direction.includes("e");
  const changesHeightFromNorth = resizeAxis === "both" && direction.includes("n");
  const changesHeightFromSouth = resizeAxis === "both" && direction.includes("s");
  let left = placement.x;
  let right = placement.x + placement.width;
  let top = placement.y;
  let bottom = placement.y + placement.height;

  if (changesWidthFromWest) {
    left = Math.min(Math.max(0, left + options.dx), right - 1);
  }
  if (changesWidthFromEast) {
    right = Math.max(Math.min(options.metrics.columns, right + options.dx), left + 1);
  }
  if (changesHeightFromNorth) {
    top = Math.min(Math.max(0, top + options.dy), bottom - 1);
  }
  if (changesHeightFromSouth) {
    bottom = Math.max(Math.min(options.metrics.rows, bottom + options.dy), top + 1);
  }

  return clampDisplayPlacement(
    {
      ...placement,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    },
    options.metrics
  );
}

function clampDisplayPlacement(placement: WidgetPlacement, metrics: CanvasMetrics): WidgetPlacement {
  const width = Math.min(Math.max(1, placement.width), metrics.columns);
  const height = Math.min(Math.max(1, placement.height), metrics.rows);

  return {
    ...placement,
    x: Math.min(Math.max(0, placement.x), Math.max(0, metrics.columns - width)),
    y: Math.min(Math.max(0, placement.y), Math.max(0, metrics.rows - height)),
    width,
    height
  };
}

export function snapPlacementToCenterGuides(
  placement: WidgetPlacement,
  metrics: CanvasMetrics,
  axes: CenterSnapAxes = { x: true, y: true }
): WidgetPlacement {
  const threshold = 0.35;
  const canvasCenterX = metrics.columns / 2;
  const canvasCenterY = metrics.rows / 2;
  const widgetCenterX = placement.x + placement.width / 2;
  const widgetCenterY = placement.y + placement.height / 2;

  return clampDisplayPlacement(
    {
      ...placement,
      x: axes.x && Math.abs(widgetCenterX - canvasCenterX) <= threshold ? canvasCenterX - placement.width / 2 : placement.x,
      y: axes.y && Math.abs(widgetCenterY - canvasCenterY) <= threshold ? canvasCenterY - placement.height / 2 : placement.y
    },
    metrics
  );
}

function getAlignmentGuides(placement: WidgetPlacement, metrics: CanvasMetrics, centerSnapAxes: CenterSnapAxes): AlignmentGuide[] {
  // Guides are intentionally fuzzy so fractional Widget Placement still snaps visually near edges/center.
  const threshold = 0.35;
  const xCandidates = [
    { label: "Left", value: placement.x, target: 0, position: 0 },
    {
      label: "Center",
      value: placement.x + placement.width / 2,
      target: metrics.columns / 2,
      position: (metrics.columns * metrics.cellWidth) / 2,
      enabled: centerSnapAxes.x
    },
    {
      label: "Right",
      value: placement.x + placement.width,
      target: metrics.columns,
      position: metrics.columns * metrics.cellWidth
    }
  ];
  const yCandidates = [
    { label: "Top", value: placement.y, target: 0, position: 0 },
    {
      label: "Middle",
      value: placement.y + placement.height / 2,
      target: metrics.rows / 2,
      position: (metrics.rows * metrics.cellHeight) / 2,
      enabled: centerSnapAxes.y
    },
    {
      label: "Bottom",
      value: placement.y + placement.height,
      target: metrics.rows,
      position: metrics.rows * metrics.cellHeight
    }
  ];

  return [
    ...xCandidates
      .filter((candidate) => candidate.enabled !== false && Math.abs(candidate.value - candidate.target) <= threshold)
      .map((candidate) => ({ axis: "x" as const, label: candidate.label, position: candidate.position })),
    ...yCandidates
      .filter((candidate) => candidate.enabled !== false && Math.abs(candidate.value - candidate.target) <= threshold)
      .map((candidate) => ({ axis: "y" as const, label: candidate.label, position: candidate.position }))
  ];
}

function getCornerLabel(guides: AlignmentGuide[]) {
  const xGuide = guides.find((guide) => guide.axis === "x" && guide.label !== "Center");
  const yGuide = guides.find((guide) => guide.axis === "y" && guide.label !== "Middle");
  if (!xGuide || !yGuide) {
    return null;
  }

  return `${yGuide.label} ${xGuide.label}`;
}
