import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CanvasGrid, WidgetId, WidgetPlacement } from "../domain/canvas";

type CanvasMetrics = CanvasGrid & {
  cellWidth: number;
  cellHeight: number;
};

type CanvasSurfaceProps = {
  children: ReactNode;
  editMode: boolean;
  metrics: CanvasMetrics;
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
  widgetId: WidgetId;
};

export function CanvasSurface({ children, editMode, metrics }: CanvasSurfaceProps) {
  const style = {
    "--canvas-columns": metrics.columns,
    "--canvas-rows": metrics.rows,
    "--canvas-cell-width": `${metrics.cellWidth}px`,
    "--canvas-cell-height": `${metrics.cellHeight}px`
  } as CSSProperties;

  return (
    <section className={`canvas-surface${editMode ? " editing" : ""}`} aria-label="Canvas" style={style}>
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
  placement,
  widgetId
}: WidgetFrameProps) {
  const [displayPlacement, setDisplayPlacement] = useState(placement);
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
      flushPersist(onResize);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <article
      className={`widget-frame${editMode ? " editing" : ""}${enabled ? "" : " disabled"}`}
      data-widget-id={widgetId}
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
  );
}
