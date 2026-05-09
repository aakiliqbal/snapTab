import { useMemo, useState, useRef, useEffect, type CSSProperties, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { Folder as FolderIcon } from "lucide-react";
import type { DropAction } from "../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../domain/tabOperations";
import type { Shortcut, TabState } from "../domain/tabState";
import { createDropAction } from "./drag/dropActionAdapter";
import { hideNativeDragImage } from "./drag/dragImage";
import {
  captureTileRects,
  computeDropIndex,
  emptyShift,
  getDropPosition,
  getShiftBetweenRects,
  getTileIdFromKey,
  toDropZone,
  type PageEdgeDirection,
  type DropPosition
} from "./drag/dragGeometry";
import type { DragSource } from "./drag/dragModel";
import { ShortcutIcon } from "./ShortcutIcon";

export type ShortcutPageItem =
  | ResolvedTopLevelTile
  | {
      key: "create:shortcut";
      type: "create-shortcut";
    };

type ShortcutGridProps = {
  activeShortcutPageIndex: number;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  outgoingDragSource: DragSource | null;
  onClearOutgoingDrag: () => void;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onOpenNewShortcutDialog: () => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  onSetActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  pageCapacity: number;
  pageCount: number;
  showPageDots?: boolean;
  showLabels: boolean;
  tabState: TabState;
  visibleShortcutPageItems: ShortcutPageItem[];
};

type DragState = {
  sourcePageId: string;
  sourcePageIndex: number;
  sourcePageTileIndex: number;
  sourceIndex: number;
  sourceKey: string;
  initialRects: Record<string, DOMRect>;
};

const PAGE_EDGE_HOVER_MS = 300;
const PAGE_EDGE_REPEAT_MS = 900;
const ZONE_DEBOUNCE_MS = 200;

export function ShortcutGrid({
  activeShortcutPageIndex,
  dispatchDropAction,
  gridRef,
  outgoingDragSource,
  onClearOutgoingDrag,
  onEditFolder,
  onEditShortcut,
  onOpenNewShortcutDialog,
  onSetActiveFolderId,
  onSetActiveShortcutPage,
  pageCapacity,
  pageCount,
  showPageDots = true,
  showLabels,
  tabState,
  visibleShortcutPageItems
}: ShortcutGridProps) {
  const reducedMotion = useReducedMotion();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [activePageEdge, setActivePageEdge] = useState<PageEdgeDirection | null>(null);
  const [pageEdgeStyle, setPageEdgeStyle] = useState<{ prev: CSSProperties; next: CSSProperties } | null>(null);
  const [outgoingInitialRects, setOutgoingInitialRects] = useState<Record<string, DOMRect> | null>(null);

  // Timer-based zone detection refs
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageEdgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageEdgeDirectionRef = useRef<PageEdgeDirection | null>(null);
  const pageEdgeDelayRef = useRef(PAGE_EDGE_HOVER_MS);
  const dropHandledRef = useRef(false);
  const [confirmedZone, setConfirmedZone] = useState<DropPosition | null>(null);

  const clearMoveTimer = () => {
    if (moveTimerRef.current) {
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }
  };

  const clearPageEdgeTimer = () => {
    if (pageEdgeTimerRef.current) {
      clearTimeout(pageEdgeTimerRef.current);
      pageEdgeTimerRef.current = null;
    }

    pageEdgeDirectionRef.current = null;
    pageEdgeDelayRef.current = PAGE_EDGE_HOVER_MS;
    setActivePageEdge(null);
    setPageEdgeStyle(null);
  };

  const clearDragSession = () => {
    clearMoveTimer();
    clearPageEdgeTimer();
    setDragState(null);
    setDropTargetKey(null);
    setDropPosition(null);
    setConfirmedZone(null);
    setOutgoingInitialRects(null);
    setDragOverlay(null);
  };

  // When outgoingDragSource is set, clear stale state
  useEffect(() => {
    if (outgoingDragSource) {
      clearDragSession();
      dropHandledRef.current = false; // Reset for new folder-child drag
      requestAnimationFrame(() => {
        setOutgoingInitialRects(captureTileRects(gridRef.current));
      });
    }
  }, [outgoingDragSource]);

  // After outgoingDragSource is set, prepare overlay data for folder-child drags.
  // Position waits for first dragover so the tile does not flash at viewport center.
  useEffect(() => {
    if (!outgoingDragSource || outgoingDragSource.kind !== "folder-child") return;
    const shortcut = tabState.tiles[outgoingDragSource.shortcutId];
    if (!shortcut || shortcut.kind !== "shortcut") return;
    const tile: ResolvedTopLevelTile = {
      type: "shortcut",
      key: `shortcut:${shortcut.id}`,
      shortcut
    };
    setDragOverlay({ tile, x: Number.NaN, y: Number.NaN });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outgoingDragSource]);

  // Cleanup on global dragend/drop events
  useEffect(() => {
    if (!outgoingDragSource) return;

    const handleGlobalEnd = () => {
      onClearOutgoingDrag();
      clearDragSession();
    };
    window.addEventListener("dragend", handleGlobalEnd, { once: true });
    window.addEventListener("drop", handleGlobalEnd, { once: true });
    return () => {
      window.removeEventListener("dragend", handleGlobalEnd);
      window.removeEventListener("drop", handleGlobalEnd);
    };
  }, [outgoingDragSource, onClearOutgoingDrag]);

  // Real tile following pointer (like Infinity Pro)
  const [dragOverlay, setDragOverlay] = useState<{
    tile: ResolvedTopLevelTile;
    x: number;
    y: number;
  } | null>(null);
  const draggableTiles = useMemo(
    () => visibleShortcutPageItems.filter((item: ShortcutPageItem): item is ResolvedTopLevelTile => item.type === "shortcut" || item.type === "folder"),
    [visibleShortcutPageItems]
  );
  const draggableTileByKey = useMemo(
    () => new Map(draggableTiles.map((tile, index) => [tile.key, { index, tile }])),
    [draggableTiles]
  );
  const visibleItemByKey = useMemo(
    () => new Map(visibleShortcutPageItems.map((tile, index) => [tile.key, { index, tile }])),
    [visibleShortcutPageItems]
  );
  const visibleKeyIndexByKey = useMemo(
    () => new Map(visibleShortcutPageItems.map((tile, index) => [tile.key, index])),
    [visibleShortcutPageItems]
  );

  // Track pointer movement for drag overlay
  useEffect(() => {
    if (!dragOverlay) return;
    
    const handleMove = (e: MouseEvent) => {
      setDragOverlay(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };
    
    const handleEnd = () => {
      setDragOverlay(null);
    };
    
    window.addEventListener('dragover', handleMove);
    window.addEventListener('dragend', handleEnd);
    window.addEventListener('drop', handleEnd);
    
    return () => {
      window.removeEventListener('dragover', handleMove);
      window.removeEventListener('dragend', handleEnd);
      window.removeEventListener('drop', handleEnd);
    };
  }, [dragOverlay]);

  const handleZoneChange = (newZone: DropPosition) => {
    clearMoveTimer();
    
    if (newZone !== confirmedZone) {
      moveTimerRef.current = setTimeout(() => {
        setConfirmedZone(newZone);
        setDropPosition(newZone);
        moveTimerRef.current = null;
      }, ZONE_DEBOUNCE_MS);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLElement>, tileKey: string, index: number) => {
    const tile = draggableTileByKey.get(tileKey)?.tile;
    if (!tile) return;
    
    dropHandledRef.current = false;
    
    const initialRects = captureTileRects(gridRef.current);
    const sourceId = getTileIdFromKey(tileKey);
    const sourcePagePosition = getTilePagePosition(tabState, sourceId) ?? {
      pageId: tabState.pages[activeShortcutPageIndex]?.id ?? "page-1",
      index
    };
    
    setDragState({
      sourcePageId: sourcePagePosition.pageId,
      sourcePageIndex: activeShortcutPageIndex,
      sourcePageTileIndex: sourcePagePosition.index,
      sourceIndex: index,
      sourceKey: tileKey,
      initialRects
    });
    setDropTargetKey(null);
    setDropPosition(null);
    
    setDragOverlay({
      tile,
      x: e.clientX,
      y: e.clientY
    });
    
    e.dataTransfer.effectAllowed = "move";
    hideNativeDragImage(e.dataTransfer);
    e.dataTransfer.setData("text/plain", tileKey);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, tileKey: string, rect: DOMRect) => {
    e.preventDefault();
    
    if (!dragState && !outgoingDragSource) return;
    
    const position = getDropPosition(e.clientX, rect);
    setDropTargetKey(tileKey);
    setDropPosition(position);
    
    handleZoneChange(position);
  };

  const handlePageEdgePointer = (clientX: number, clientY: number) => {
    if (pageCount <= 1 || (!dragState && !outgoingDragSource)) {
      clearPageEdgeTimer();
      return;
    }

    const direction = getGridPageEdgeDirection(clientX, clientY);
    if (!direction) {
      clearPageEdgeTimer();
      return;
    }

    setActivePageEdge(direction);

    if (pageEdgeDirectionRef.current === direction && pageEdgeTimerRef.current) {
      return;
    }

    if (pageEdgeDirectionRef.current !== direction) {
      clearPageEdgeTimer();
      setActivePageEdge(direction);
      pageEdgeDirectionRef.current = direction;
    }

    pageEdgeTimerRef.current = setTimeout(() => {
      onSetActiveShortcutPage((current) => {
        if (direction === "next") {
          return (current + 1) % pageCount;
        }

        return (current - 1 + pageCount) % pageCount;
      });
      pageEdgeTimerRef.current = null;
      pageEdgeDelayRef.current = PAGE_EDGE_REPEAT_MS;
      setDropTargetKey(null);
      setDropPosition(null);
      setConfirmedZone(null);
      requestAnimationFrame(() => {
        setOutgoingInitialRects(captureTileRects(gridRef.current));
      });
    }, pageEdgeDelayRef.current);
  };

  const cancelDragOutsideGrid = () => {
    if (outgoingDragSource) {
      onClearOutgoingDrag();
    }
    clearDragSession();
  };

  const isPointInsideGrid = (clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    return Boolean(
      rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const isDropInsideGridElement = (event: DragEvent | React.DragEvent<HTMLElement>) => {
    const grid = gridRef.current;
    return Boolean(grid && document.elementsFromPoint(event.clientX, event.clientY).some((element) => element === grid || grid.contains(element)));
  };

  const isPointInsideDragArea = (clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || clientY < rect.top || clientY > rect.bottom) {
      return false;
    }

    const edgeWidth = getGridEdgeWidth();
    return clientX >= rect.left - edgeWidth && clientX <= rect.right + edgeWidth;
  };

  const getGridEdgeWidth = () => Math.min(window.innerWidth * 0.1, 130);

  const getGridPageEdgeDirection = (clientX: number, clientY: number | undefined): PageEdgeDirection | null => {
    if (pageCount <= 1) {
      return null;
    }

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || (clientY !== undefined && (clientY < rect.top || clientY > rect.bottom))) {
      return null;
    }

    const edgeWidth = getGridEdgeWidth();
    if (clientX >= rect.left - edgeWidth && clientX <= rect.left) {
      return "prev";
    }

    if (clientX >= rect.right && clientX <= rect.right + edgeWidth) {
      return "next";
    }

    return null;
  };

  const syncPageEdgeStyle = () => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) {
      setPageEdgeStyle(null);
      return;
    }

    const edgeWidth = getGridEdgeWidth();
    setPageEdgeStyle({
      prev: { top: rect.top, left: Math.max(0, rect.left - edgeWidth), width: edgeWidth, height: rect.height },
      next: { top: rect.top, left: rect.right, width: edgeWidth, height: rect.height }
    });
  };

  const clearDropPreview = () => {
    clearMoveTimer();
    setDropTargetKey(null);
    setDropPosition(null);
    setConfirmedZone(null);
  };

  useEffect(() => {
    if (!dragState && !outgoingDragSource) {
      return;
    }

    const handleWindowDragOver = (event: DragEvent) => {
      const insideGrid = isPointInsideGrid(event.clientX, event.clientY);
      const edgeDirection = getGridPageEdgeDirection(event.clientX, event.clientY);

      if (!isPointInsideDragArea(event.clientX, event.clientY)) {
        cancelDragOutsideGrid();
        return;
      }

      if (!insideGrid) {
        clearDropPreview();
      }

      handlePageEdgePointer(event.clientX, event.clientY);
    };

    const handleWindowDrop = (event: DragEvent) => {
      if (!isDropInsideGridElement(event)) {
        event.preventDefault();
        cancelDragOutsideGrid();
      }
    };

    syncPageEdgeStyle();
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop, true);
    window.addEventListener("resize", syncPageEdgeStyle);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop, true);
      window.removeEventListener("resize", syncPageEdgeStyle);
    };
  }, [dragState, outgoingDragSource, pageCount, activeShortcutPageIndex]);

  const handleDragLeave = () => {
    clearMoveTimer();
    setConfirmedZone(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, targetKey: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropHandledRef.current) return;
    dropHandledRef.current = true;

    // Handle outgoing drag (folder-child → top-level tile)
    if (!dragState && outgoingDragSource) {
      const effectiveZone = confirmedZone ?? dropPosition;
      if (effectiveZone) {
        const targetTile = draggableTileByKey.get(targetKey)?.tile;
        const targetId = getTileIdFromKey(targetKey);
        const targetPosition = targetTile
          ? getTilePagePosition(tabState, targetId) ?? getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity)
          : getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity);
        const resolvedIndex = targetTile
          ? effectiveZone === "right" ? targetPosition.index + 1 : targetPosition.index
          : targetPosition.index;
        const action = createDropAction(outgoingDragSource, {
          ...(targetTile
            ? {
                kind: "top-level-tile" as const,
                tileKind: targetTile.type,
                tileId: targetId,
                zone: toDropZone(effectiveZone)
              }
            : { kind: "page-surface" as const }),
          pageId: targetPosition.pageId,
          index: resolvedIndex
        });
        if (action.type !== "CANCEL") {
          dispatchDropAction(action);
        }
      }
      onClearOutgoingDrag();
      clearDragSession();
      return;
    }

    if (!dragState || dragState.sourceKey === targetKey) {
      clearDragSession();
      return;
    }

    // Use confirmed zone (after debounce) for the actual drop action
    // Fall back to dropPosition if confirmedZone is null (user dropped quickly)
    const position = confirmedZone ?? dropPosition;
    
    if (!position) {
      clearDragSession();
      return;
    }

    const sourceId = getTileIdFromKey(dragState.sourceKey);
    const sourceTileRecord = tabState.tiles[sourceId];
    const sourceTileKind = sourceTileRecord?.kind;
    const targetTile = draggableTileByKey.get(targetKey)?.tile;

    if ((sourceTileKind !== "shortcut" && sourceTileKind !== "folder") || !targetTile) {
      clearDragSession();
      return;
    }

    const targetId = getTileIdFromKey(targetKey);
    const targetPosition = getTilePagePosition(tabState, targetId) ?? {
      pageId: tabState.pages[activeShortcutPageIndex]?.id ?? "page-1",
      index: targetIndex
    };
    const sourceIndex = dragState.sourcePageTileIndex;
    const toIndex =
      position === "center"
        ? targetPosition.index
        : dragState.sourcePageId === targetPosition.pageId
          ? computeDropIndex(sourceIndex, targetPosition.index, position)
          : position === "right"
            ? targetPosition.index + 1
            : targetPosition.index;
    const action = createDropAction(
      {
        kind: "top-level",
        tileKind: sourceTileKind,
        tileId: sourceId,
        pageId: dragState.sourcePageId,
        index: sourceIndex
      },
      {
        kind: "top-level-tile",
        tileKind: targetTile.type,
        tileId: targetId,
        pageId: targetPosition.pageId,
        index: toIndex,
        zone: toDropZone(position)
      }
    );

    dispatchDropAction(action);
    clearDragSession();
  };

  const handleDragEnd = () => {
    dropHandledRef.current = false;
    clearDragSession();
  };

  const overTile = dropTargetKey ? draggableTileByKey.get(dropTargetKey)?.tile : null;
  // Source is a shortcut if it's a regular grid shortcut OR a folder-child (always shortcuts)
  const sourceIsShortcut =
    dragState
      ? tabState.tiles[getTileIdFromKey(dragState.sourceKey)]?.kind === "shortcut"
      : outgoingDragSource?.kind === "folder-child";
  const isCombinePreview =
    sourceIsShortcut &&
    dropTargetKey !== null &&
    confirmedZone === "center" &&
    (dragState ? dragState.sourceKey !== dropTargetKey : true) &&
    overTile?.type === "shortcut";

  // Compute live shifting - which tiles should shift as we drag (FLIP-like animation)
  // Use dropPosition (immediate) not confirmedZone (debounced) for live feedback
  const getTileShift = (tileKey: string): { x: number, y: number } => {
    if (outgoingDragSource && tileKey === "create:shortcut") {
      return emptyShift;
    }

    if (!dropTargetKey || !dropPosition || dropPosition === "center") {
      return emptyShift;
    }

    if (dragState && dragState.sourcePageIndex !== activeShortcutPageIndex) {
      return emptyShift;
    }
    
    const activeZone = confirmedZone ?? dropPosition;
    const targetIndex = outgoingDragSource
      ? visibleItemByKey.get(dropTargetKey)?.index ?? -1
      : draggableTileByKey.get(dropTargetKey)?.index ?? -1;
    
    if (targetIndex === -1) {
      return emptyShift;
    }
    
    const tileIndex = outgoingDragSource
      ? visibleItemByKey.get(tileKey)?.index ?? -1
      : draggableTileByKey.get(tileKey)?.index ?? -1;
    if (tileIndex === -1) return emptyShift;
    
    let shift = 0;
    const sourceIndex = dragState ? draggableTileByKey.get(dragState.sourceKey)?.index ?? -1 : -1;
    if (dragState) {
      if (sourceIndex === -1 || sourceIndex === targetIndex) {
        return emptyShift;
      }

      if (sourceIndex < targetIndex) {
        if (activeZone === "right") {
          if (tileIndex > sourceIndex && tileIndex <= targetIndex) shift = -1;
        } else if (activeZone === "left") {
          if (tileIndex > sourceIndex && tileIndex < targetIndex) shift = -1;
        }
      } else if (sourceIndex > targetIndex) {
        if (activeZone === "left") {
          if (tileIndex >= targetIndex && tileIndex < sourceIndex) shift = 1;
        } else if (activeZone === "right") {
          if (tileIndex > targetIndex && tileIndex < sourceIndex) shift = 1;
        }
      }
    } else if (outgoingDragSource) {
      const insertIndex = activeZone === "right" ? targetIndex + 1 : targetIndex;
      if (tileIndex >= insertIndex) shift = 1;
    }
    
    if (shift === 0) return emptyShift;

    const targetTileIndex = tileIndex + shift;
    const shiftItems = outgoingDragSource ? visibleShortcutPageItems : draggableTiles;
    const targetTile = shiftItems[targetTileIndex];
    const initialRects = dragState?.initialRects ?? outgoingInitialRects;
    
    if (targetTile && initialRects?.[tileKey] && initialRects[targetTile.key]) {
      const sourceRect = initialRects[tileKey];
      const targetRect = initialRects[targetTile.key];
      return getShiftBetweenRects(sourceRect, targetRect);
    }

    if (outgoingDragSource && targetTileIndex === shiftItems.length && initialRects?.[tileKey]) {
      return getOverflowShift(initialRects[tileKey]);
    }
    
    return emptyShift;
  };

  const getOverflowShift = (sourceRect: DOMRect) => {
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) {
      return emptyShift;
    }

    return {
      x: gridRect.right - sourceRect.left + sourceRect.width,
      y: 0
    };
  };

  return (
    <>
      {pageCount > 1 && pageEdgeStyle && (dragState || outgoingDragSource) ? (
        <>
          <div
            className={["shortcut-page-edge", "shortcut-page-edge-prev", activePageEdge === "prev" ? "active" : ""]
              .filter(Boolean)
              .join(" ")}
            style={pageEdgeStyle.prev}
            aria-hidden="true"
          />
          <div
            className={["shortcut-page-edge", "shortcut-page-edge-next", activePageEdge === "next" ? "active" : ""]
              .filter(Boolean)
              .join(" ")}
            style={pageEdgeStyle.next}
            aria-hidden="true"
          />
        </>
      ) : null}
      <section
        className="quick-link-grid"
        aria-label="Quick links"
        key={`shortcut-page-${activeShortcutPageIndex}`}
        ref={gridRef}
        onDragEnter={(e) => {
          if (outgoingDragSource) {
            e.preventDefault();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          handlePageEdgePointer(e.clientX, e.clientY);
          if (outgoingDragSource) {
            // Get the tile under the cursor using elementsFromPoint
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const tileEl = elements.find(el => el.classList.contains('quick-link') && !el.classList.contains('dragging-origin'));
            if (tileEl) {
              const rect = tileEl.getBoundingClientRect();
              const tileKey = tileEl.getAttribute('data-tile-key');
              if (tileKey) {
                handleDragOver(e as unknown as React.DragEvent<HTMLElement>, tileKey, rect);
              }
            }
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!isDropInsideGridElement(e)) {
            cancelDragOutsideGrid();
            return;
          }

          if (dropHandledRef.current) return;
          // Handle folder-child promote when dropped on a known tile
          if (outgoingDragSource && dropTargetKey) {
            dropHandledRef.current = true;
            const targetIndex = visibleKeyIndexByKey.get(dropTargetKey) ?? 0;
            const targetTile = draggableTileByKey.get(dropTargetKey)?.tile;
            const targetId = getTileIdFromKey(dropTargetKey);
            const effectiveZone = confirmedZone ?? dropPosition;
            const targetPosition = targetTile
              ? getTilePagePosition(tabState, targetId) ?? getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity)
              : getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity);
            const zone = effectiveZone === "center" ? "center" : effectiveZone === "right" ? "trailing" : "leading";
            const resolvedIndex = targetTile
              ? effectiveZone === "right" ? targetPosition.index + 1 : targetPosition.index
              : targetPosition.index;
            const action = createDropAction(outgoingDragSource, {
              ...(targetTile
                ? {
                    kind: "top-level-tile" as const,
                    tileKind: targetTile.type,
                    tileId: targetId,
                    zone
                  }
                : { kind: "page-surface" as const }),
              pageId: targetPosition.pageId,
              index: resolvedIndex
            });
            if (action.type !== "CANCEL") {
              dispatchDropAction(action);
            }
            onClearOutgoingDrag();
            clearDragSession();
          } else if (outgoingDragSource) {
            // Dropped on empty grid space — promote to end of current page
            const targetPosition = getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity);
            const action = createDropAction(outgoingDragSource, {
              kind: "page-surface",
              pageId: targetPosition.pageId,
              index: targetPosition.index
            });
            if (action.type !== "CANCEL") {
              dispatchDropAction(action);
            }
            onClearOutgoingDrag();
            clearDragSession();
          } else if (dragState && !dropTargetKey) {
            const sourceId = getTileIdFromKey(dragState.sourceKey);
            const sourceTile = tabState.tiles[sourceId];
            const targetPosition = getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity);

            if (sourceTile?.kind === "shortcut" || sourceTile?.kind === "folder") {
              const toIndex =
                dragState.sourcePageId === targetPosition.pageId && dragState.sourcePageTileIndex < targetPosition.index
                  ? Math.max(0, targetPosition.index - 1)
                  : targetPosition.index;
              const action = createDropAction(
                {
                  kind: "top-level",
                  tileKind: sourceTile.kind,
                  tileId: sourceId,
                  pageId: dragState.sourcePageId,
                  index: dragState.sourcePageTileIndex
                },
                {
                  kind: "page-surface",
                  pageId: targetPosition.pageId,
                  index: toIndex
                }
              );
              if (action.type !== "CANCEL") {
                dispatchDropAction(action);
              }
            }

            clearDragSession();
          } else if (dropTargetKey && dragState) {
            const targetTile = draggableTileByKey.get(dropTargetKey)?.tile;
            if (targetTile) {
              const targetIndex = visibleKeyIndexByKey.get(dropTargetKey) ?? -1;
              handleDrop(e as unknown as React.DragEvent<HTMLElement>, dropTargetKey, targetIndex >= 0 ? targetIndex : 0);
            }
          }
        }}
      >
        {visibleShortcutPageItems.map((tile: ShortcutPageItem, index: number) => {
          const shift = getTileShift(tile.key);
          const tileShiftStyle = (shift.x !== 0 || shift.y !== 0) ? { 
            transform: `translate(${shift.x}px, ${shift.y}px)`,
            transition: reducedMotion ? 'none' : 'transform 100ms ease-out'
          } : {};

          if (tile.type === "create-shortcut") {
            return (
              <button
                className="quick-link add-link"
                data-tile-key={tile.key}
                key={tile.key}
                onClick={onOpenNewShortcutDialog}
                style={tileShiftStyle}
                type="button"
              >
                <span className="quick-link-icon add-link-icon" aria-hidden="true">
                  +
                </span>
                <span className="quick-link-title">Add</span>
              </button>
            );
          }

          const isDragging = dragState?.sourceKey === tile.key;
          const isDropTarget = dropTargetKey === tile.key;
          
          const effectiveZone = confirmedZone ?? dropPosition;
          let tileClassName = [
            "quick-link",
            tile.type === "folder" ? "folder-link" : "",
            isDragging ? "dragging-origin" : "",
            isDropTarget && effectiveZone === "center" ? "drop-center" : "",
            isDropTarget && effectiveZone === "left" ? "drop-leading" : "",
            isDropTarget && effectiveZone === "right" ? "drop-trailing" : "",
            isCombinePreview ? "combine-preview" : ""
          ].filter(Boolean).join(" ");

          const handleDragOverWrapper = (e: React.DragEvent<HTMLElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleDragOver(e, tile.key, rect);
          };

          const handleDropWrapper = (e: React.DragEvent<HTMLElement>) => {
            handleDrop(e, tile.key, index);
          };

          if (tile.type === "shortcut") {
            return (
              <a
                href={tile.shortcut.url}
                key={tile.key}
                data-tile-key={tile.key}
                className={tileClassName}
                style={{ 
                  transition: reducedMotion ? 'none' : 'transform 150ms ease',
                  ...tileShiftStyle
                }}
                draggable={true}
                onDragStart={(e: React.DragEvent<HTMLAnchorElement>) => handleDragStart(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
                onDragOver={handleDragOverWrapper}
                onDragLeave={handleDragLeave}
                onDrop={handleDropWrapper}
                onDragEnd={handleDragEnd}
              >
                <TileContent tile={tile} showLabels={showLabels} />
                <button
                  className="quick-link-edit"
                  type="button"
                  aria-label={`Edit ${tile.shortcut.title}`}
                  onClick={(event: React.MouseEvent) => {
                    event.preventDefault();
                    onEditShortcut(tile.shortcut);
                  }}
                >
                  Edit
                </button>
              </a>
            );
          }

          return (
            <div
              key={tile.key}
              data-tile-key={tile.key}
              className={tileClassName}
              style={{ 
                transition: reducedMotion ? 'none' : 'transform 150ms ease',
                ...tileShiftStyle
              }}
              draggable={true}
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
              onDragOver={handleDragOverWrapper}
              onDragLeave={handleDragLeave}
              onDrop={handleDropWrapper}
              onDragEnd={handleDragEnd}
              role="button"
              tabIndex={0}
              onClick={() => onSetActiveFolderId(tile.folder.id)}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSetActiveFolderId(tile.folder.id);
                }
              }}
            >
              <TileContent tile={tile} showLabels={showLabels} />
              <button
                className="quick-link-edit"
                type="button"
                aria-label={`Edit ${tile.folder.title}`}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onEditFolder(tile.folder);
                }}
              >
                Edit
              </button>
            </div>
          );
        })}
      </section>
      <nav className="shortcut-page-footer" aria-label="Shortcut pages">
        {showPageDots && pageCount > 1 ? (
          <div className="shortcut-page-dots">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                aria-label={`Go to shortcut page ${index + 1}`}
                aria-current={index === activeShortcutPageIndex ? "page" : undefined}
                className={index === activeShortcutPageIndex ? "active" : ""}
                key={index}
                onClick={() => onSetActiveShortcutPage(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </nav>
      
      {/* Drag overlay - real tile following pointer with shadow (like Infinity Pro) */}
      {dragOverlay && Number.isFinite(dragOverlay.x) && Number.isFinite(dragOverlay.y) && (
        <div
          className={["drag-overlay-tile", isCombinePreview ? "merge-active" : ""].filter(Boolean).join(" ")}
          style={{
            position: 'fixed',
            left: dragOverlay.x - 40,
            top: dragOverlay.y - 40,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <TileContent tile={dragOverlay.tile} showLabels={showLabels} />
          {isCombinePreview ? (
            <span className="drag-overlay-merge" aria-hidden="true">
              +
            </span>
          ) : null}
        </div>
      )}
    </>
  );
}

function TileContent({ showLabels, tile }: { showLabels: boolean; tile: ResolvedTopLevelTile }) {
  if (tile.type === "shortcut") {
    return (
      <>
        <ShortcutIcon shortcut={tile.shortcut} />
        {showLabels ? <span className="quick-link-title">{tile.shortcut.title}</span> : null}
      </>
    );
  }

  return (
    <>
      <span className="quick-link-icon folder-icon" style={{ backgroundColor: tile.folder.icon.background }} aria-hidden="true">
        <FolderIcon strokeWidth={2.25} />
        <span className="folder-count">{tile.folder.shortcuts.length}</span>
      </span>
      {showLabels ? <span className="quick-link-title">{tile.folder.title}</span> : null}
    </>
  );
}

function getTilePagePosition(state: TabState, tileId: string) {
  for (const page of state.pages) {
    const index = page.tileIds.indexOf(tileId);
    if (index >= 0) {
      return { pageId: page.id, index };
    }
  }

  return null;
}

function getVisualPageEndPosition(state: TabState, visualPageIndex: number, pageCapacity: number) {
  const topLevelCount = state.pages.reduce((count, page) => count + page.tileIds.length, 0);
  const visualEndIndex = Math.min((visualPageIndex + 1) * pageCapacity, topLevelCount);
  return getInsertionPositionFromGlobalIndex(state, visualEndIndex);
}

function getInsertionPositionFromGlobalIndex(state: TabState, globalIndex: number) {
  let offset = 0;

  for (const page of state.pages) {
    const pageEnd = offset + page.tileIds.length;
    if (globalIndex <= pageEnd) {
      return { pageId: page.id, index: Math.max(0, globalIndex - offset) };
    }

    offset = pageEnd;
  }

  const fallbackPage = state.pages[state.pages.length - 1] ?? { id: "page-1", tileIds: [] };
  return { pageId: fallbackPage.id, index: fallbackPage.tileIds.length };
}
