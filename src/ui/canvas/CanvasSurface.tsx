import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CanvasGrid, WidgetId, WidgetPlacement } from "../../domain/canvas";

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

type WidgetFrameProps = {
  children: ReactNode;
  editMode: boolean;
  enabled: boolean;
  label: string;
  metrics: CanvasMetrics;
  onMove: (placement: WidgetPlacement) => void;
  onResize: (placement: WidgetPlacement) => void;
  placement: WidgetPlacement;
  onWidgetContextMenu?: (widgetId: WidgetId, event: React.MouseEvent<HTMLElement>) => void;
  widgetId: WidgetId;
};

type AlignmentGuide = {
  axis: "x" | "y";
  label: string;
  position: number;
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

export function WidgetFrame({
  children,
  editMode,
  enabled,
  label,
  metrics,
  onMove,
  onResize,
  onWidgetContextMenu,
  placement,
  widgetId
}: WidgetFrameProps) {
  const [displayPlacement, setDisplayPlacement] = useState(placement);
  const [isInteracting, setIsInteracting] = useState(false);
  const pendingPlacementRef = useRef<WidgetPlacement | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayPlacement(placement);
  }, [placement]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  if (!enabled && !editMode) {
    return null;
  }

  const style = {
    left: `${displayPlacement.x * metrics.cellWidth}px`,
    top: `${displayPlacement.y * metrics.cellHeight}px`,
    width: `${displayPlacement.width * metrics.cellWidth}px`,
    height: `${displayPlacement.height * metrics.cellHeight}px`,
    zIndex: displayPlacement.zIndex
  } as CSSProperties;
  const alignmentGuides = isInteracting ? getAlignmentGuides(displayPlacement, metrics) : [];
  const cornerLabel = getCornerLabel(alignmentGuides);

  function schedulePersist(nextPlacement: WidgetPlacement, persist: (placement: WidgetPlacement) => void) {
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
  }

  function flushPersist(persist: (placement: WidgetPlacement) => void) {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    if (pendingPlacementRef.current) {
      persist(pendingPlacementRef.current);
      pendingPlacementRef.current = null;
    }
  }

  function startMove(event: React.PointerEvent<HTMLElement>) {
    if (!editMode || event.button !== 0) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = placement;
    setIsInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPlacement = {
        ...startPlacement,
        x: startPlacement.x + (moveEvent.clientX - startX) / metrics.cellWidth,
        y: startPlacement.y + (moveEvent.clientY - startY) / metrics.cellHeight
      };
      setDisplayPlacement(nextPlacement);
      schedulePersist(nextPlacement, onMove);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setIsInteracting(false);
      flushPersist(onMove);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    if (!editMode || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = placement;
    setIsInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextPlacement = {
        ...startPlacement,
        width: startPlacement.width + (moveEvent.clientX - startX) / metrics.cellWidth,
        height: startPlacement.height + (moveEvent.clientY - startY) / metrics.cellHeight
      };
      setDisplayPlacement(nextPlacement);
      schedulePersist(nextPlacement, onResize);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setIsInteracting(false);
      flushPersist(onResize);
    }

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
        <div className="widget-frame-content">
          {children}
        </div>
        {editMode ? (
          <button className="widget-resize-handle" type="button" aria-label={`Resize ${label}`} onPointerDown={startResize} />
        ) : null}
      </article>
    </>
  );
}

function getAlignmentGuides(placement: WidgetPlacement, metrics: CanvasMetrics): AlignmentGuide[] {
  const threshold = 0.35;
  const xCandidates = [
    { label: "Left", value: placement.x, target: 0, position: 0 },
    {
      label: "Center",
      value: placement.x + placement.width / 2,
      target: metrics.columns / 2,
      position: (metrics.columns * metrics.cellWidth) / 2
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
      position: (metrics.rows * metrics.cellHeight) / 2
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
      .filter((candidate) => Math.abs(candidate.value - candidate.target) <= threshold)
      .map((candidate) => ({ axis: "x" as const, label: candidate.label, position: candidate.position })),
    ...yCandidates
      .filter((candidate) => Math.abs(candidate.value - candidate.target) <= threshold)
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
