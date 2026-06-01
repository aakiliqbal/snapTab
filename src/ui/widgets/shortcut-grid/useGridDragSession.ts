import { useState, useRef, useEffect, useMemo, type RefObject } from "react";
import type { DropAction } from "../../../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../../../domain/tabOperations";
import type { TabState } from "../../../domain/tabState";
import { createDropAction } from "../../drag/dropActionAdapter";
import { hideNativeDragImage } from "../../drag/dragImage";
import {
  captureTileRects,
  computeDropIndex,
  emptyShift,
  getDropPosition,
  getHorizontalGridPageEdgeDirection,
  getShiftBetweenRects,
  getTileIdFromKey,
  toDropZone,
  type PageEdgeDirection,
  type DropPosition,
  type Shift
} from "../../drag/dragGeometry";
import type { DragSource } from "../../drag/dragModel";
import type { ShortcutPageItem } from "./shortcutPageModel";
import { getTilePagePosition, getVisualPageEndPosition } from "./shortcutPageModel";
import { useNativeDragOverlayPointer, type DragOverlayState } from "./useNativeDragOverlay";

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

export type GridDragSession = {
  dragState: DragState | null;
  dragOverlay: DragOverlayState;
  dropTargetKey: string | null;
  confirmedZone: DropPosition | null;
  dropPosition: DropPosition | null;
  isCombinePreview: boolean;
  activePageEdge: PageEdgeDirection | null;
  pageEdgeStyle: { prev: React.CSSProperties; next: React.CSSProperties } | null;
  onTileDragStart: (e: React.DragEvent<HTMLElement>, tileKey: string, index: number) => void;
  onTileDragOver: (e: React.DragEvent<HTMLElement>, tileKey: string) => void;
  onTileDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onTileDrop: (e: React.DragEvent<HTMLElement>, tileKey: string, index: number) => void;
  onTileDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  onGridDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onGridDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onGridDrop: (e: React.DragEvent<HTMLElement>) => void;
  getTileShift: (tileKey: string) => Shift;
};

export function useGridDragSession({
  activeShortcutPageIndex,
  dispatchDropAction,
  gridRef,
  outgoingDragSource,
  onClearOutgoingDrag,
  onSetActiveShortcutPage,
  pageCapacity,
  pageCount,
  tabState,
  visibleShortcutPageItems
}: {
  activeShortcutPageIndex: number;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  outgoingDragSource: DragSource | null;
  onClearOutgoingDrag: () => void;
  onSetActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  pageCapacity: number;
  pageCount: number;
  tabState: TabState;
  visibleShortcutPageItems: ShortcutPageItem[];
}): GridDragSession {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [activePageEdge, setActivePageEdge] = useState<PageEdgeDirection | null>(null);
  const [pageEdgeStyle, setPageEdgeStyle] = useState<{ prev: React.CSSProperties; next: React.CSSProperties } | null>(null);
  const [outgoingInitialRects, setOutgoingInitialRects] = useState<Record<string, DOMRect> | null>(null);
  const [confirmedZone, setConfirmedZone] = useState<DropPosition | null>(null);

  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageEdgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageEdgeDirectionRef = useRef<PageEdgeDirection | null>(null);
  const pageEdgeDelayRef = useRef(PAGE_EDGE_HOVER_MS);
  const dropHandledRef = useRef(false);

  const [dragOverlay, setDragOverlay] = useState<DragOverlayState>(null);

  const draggableTiles = useMemo(
    () => visibleShortcutPageItems.filter((item): item is ResolvedTopLevelTile => item.type === "shortcut" || item.type === "folder"),
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

  useNativeDragOverlayPointer(dragOverlay, setDragOverlay);

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

  useEffect(() => {
    if (outgoingDragSource) {
      clearDragSession();
      dropHandledRef.current = false;
      requestAnimationFrame(() => {
        setOutgoingInitialRects(captureTileRects(gridRef.current));
      });
    }
  }, [outgoingDragSource]);

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
  }, [outgoingDragSource, tabState]);

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
    setDragOverlay({ tile, x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = "move";
    hideNativeDragImage(e.dataTransfer);
    e.dataTransfer.setData("text/plain", tileKey);
  };

  const updateDropTarget = (e: React.DragEvent<HTMLElement>, tileKey: string, rect: DOMRect) => {
    e.preventDefault();
    if (!dragState && !outgoingDragSource) return;
    const position = getDropPosition(e.clientX, rect);
    setDropTargetKey(tileKey);
    setDropPosition(position);
    handleZoneChange(position);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, tileKey: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    updateDropTarget(e, tileKey, rect);
  };

  const handlePageEdgePointer = (clientX: number, clientY: number) => {
    if (pageCount <= 1 || (!dragState && !outgoingDragSource)) {
      clearPageEdgeTimer();
      return;
    }
    const rect = gridRef.current?.getBoundingClientRect();
    const direction = getHorizontalGridPageEdgeDirection(clientX, clientY, rect, pageCount, getGridEdgeWidth());
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

  const handlePageEdgePointerFromGrid = (clientX: number, clientY: number) => {
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

  const getGridEdgeWidth = () => Math.min(window.innerWidth * 0.1, 130);

  const getGridPageEdgeDirection = (clientX: number, clientY: number | undefined): PageEdgeDirection | null => {
    if (clientY === undefined) {
      return null;
    }
    const rect = gridRef.current?.getBoundingClientRect();
    return getHorizontalGridPageEdgeDirection(clientX, clientY, rect, pageCount, getGridEdgeWidth());
  };

  const isPointVerticallyInsideGrid = (_clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    return Boolean(rect && clientY >= rect.top && clientY <= rect.bottom);
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
      if (!isPointVerticallyInsideGrid(event.clientX, event.clientY)) {
        clearDropPreview();
        clearPageEdgeTimer();
        return;
      }
      if (!insideGrid) {
        clearDropPreview();
      }
      handlePageEdgePointerFromGrid(event.clientX, event.clientY);
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

  const effectiveZone = confirmedZone ?? dropPosition;
  const overTile = dropTargetKey ? draggableTileByKey.get(dropTargetKey)?.tile : null;
  const sourceIsShortcut =
    dragState
      ? tabState.tiles[getTileIdFromKey(dragState.sourceKey)]?.kind === "shortcut"
      : outgoingDragSource?.kind === "folder-child";
  const isCombinePreview =
    sourceIsShortcut &&
    dropTargetKey !== null &&
    effectiveZone === "center" &&
    (dragState ? dragState.sourceKey !== dropTargetKey : true) &&
    overTile?.type === "shortcut";

  const getTileShift = (tileKey: string): Shift => {
    if (outgoingDragSource && tileKey === "create:shortcut") {
      return emptyShift;
    }
    if (!dropTargetKey || !dropPosition || dropPosition === "center") {
      return emptyShift;
    }
    if (dragState && dragState.sourcePageIndex !== activeShortcutPageIndex) {
      return emptyShift;
    }

    const activeZone = effectiveZone;
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

  const onTileDragStart = (e: React.DragEvent<HTMLElement>, tileKey: string, index: number) => {
    handleDragStart(e as React.DragEvent<HTMLElement>, tileKey, index);
  };

  const onTileDragOver = (e: React.DragEvent<HTMLElement>, tileKey: string) => {
    handleDragOver(e as React.DragEvent<HTMLElement>, tileKey);
  };

  const onTileDragLeave = (e: React.DragEvent<HTMLElement>) => {
    handleDragLeave();
  };

  const onTileDrop = (e: React.DragEvent<HTMLElement>, tileKey: string, index: number) => {
    handleDrop(e as React.DragEvent<HTMLElement>, tileKey, index);
  };

  const onTileDragEnd = (e: React.DragEvent<HTMLElement>) => {
    handleDragEnd();
  };

  const onGridDragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (outgoingDragSource) {
      e.preventDefault();
    }
  };

  const onGridDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    handlePageEdgePointer(e.clientX, e.clientY);
    if (outgoingDragSource) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const tileEl = elements.find(el => el.classList.contains('quick-link') && !el.classList.contains('dragging-origin'));
      if (tileEl) {
        const rect = tileEl.getBoundingClientRect();
        const tileKey = tileEl.getAttribute('data-tile-key');
        if (tileKey) {
          handleDragOver(e as unknown as React.DragEvent<HTMLElement>, tileKey);
        }
      }
    }
  };

  const onGridDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!isDropInsideGridElement(e)) {
      cancelDragOutsideGrid();
      return;
    }
    if (dropHandledRef.current) return;
    if (outgoingDragSource && dropTargetKey) {
      dropHandledRef.current = true;
      const targetIndex = visibleKeyIndexByKey.get(dropTargetKey) ?? 0;
      const targetTile = draggableTileByKey.get(dropTargetKey)?.tile;
      const targetId = getTileIdFromKey(dropTargetKey);
      const effectiveZone2 = confirmedZone ?? dropPosition;
      const targetPosition = targetTile
        ? getTilePagePosition(tabState, targetId) ?? getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity)
        : getVisualPageEndPosition(tabState, activeShortcutPageIndex, pageCapacity);
      const zone = effectiveZone2 === "center" ? "center" : effectiveZone2 === "right" ? "trailing" : "leading";
      const resolvedIndex = targetTile
        ? effectiveZone2 === "right" ? targetPosition.index + 1 : targetPosition.index
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
  };

  return {
    dragState,
    dragOverlay,
    dropTargetKey,
    confirmedZone,
    dropPosition,
    isCombinePreview,
    activePageEdge,
    pageEdgeStyle,
    onTileDragStart,
    onTileDragOver,
    onTileDragLeave,
    onTileDrop,
    onTileDragEnd,
    onGridDragEnter,
    onGridDragOver,
    onGridDrop,
    getTileShift
  };
}