import { useEffect } from "react";
import type { ResolvedTopLevelTile } from "../../../domain/tabOperations";

export type DragOverlayState = {
  tile: ResolvedTopLevelTile;
  x: number;
  y: number;
} | null;

export function useNativeDragOverlayPointer(
  dragOverlay: DragOverlayState,
  setDragOverlay: (overlay: DragOverlayState | ((current: DragOverlayState) => DragOverlayState)) => void
) {
  const isDragging = dragOverlay !== null;

  // Native drag emits pointer position through dragover; this hook isolates that browser-specific Adapter.
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (event: MouseEvent) => {
      setDragOverlay((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : null));
    };

    const handleEnd = () => {
      setDragOverlay(null);
    };

    window.addEventListener("dragover", handleMove);
    window.addEventListener("dragend", handleEnd);
    window.addEventListener("drop", handleEnd);

    return () => {
      window.removeEventListener("dragover", handleMove);
      window.removeEventListener("dragend", handleEnd);
      window.removeEventListener("drop", handleEnd);
    };
  }, [isDragging, setDragOverlay]);
}
