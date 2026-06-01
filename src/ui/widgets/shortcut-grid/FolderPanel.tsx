import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import type { DropAction } from "../../../domain/dropActions";
import { type ResolvedFolder } from "../../../domain/tabOperations";
import { type Shortcut, type TabState } from "../../../domain/tabState";
import { createDropAction } from "../../drag/dropActionAdapter";
import { hideNativeDragImage } from "../../drag/dragImage";
import { captureTileRects, computeDropIndex, emptyShift, getDropPosition, getShiftBetweenRects } from "../../drag/dragGeometry";
import type { DragSource, DropTarget } from "../../drag/dragModel";
import { ShortcutIcon } from "./shortcuts";

type FolderPanelProps = {
  activeFolder: ResolvedFolder;
  activeShortcutPageIndex: number;
  dispatchDropAction: (action: DropAction) => void;
  onClose: () => void;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onStartOutgoingDrag: (source: DragSource) => void;
  tabState: TabState;
};

const FOLDER_REORDER_DEBOUNCE_MS = 200;

export function FolderPanel({
  activeFolder,
  activeShortcutPageIndex,
  dispatchDropAction,
  onClose,
  onEditFolder,
  onEditShortcut,
  onStartOutgoingDrag,
  tabState
}: FolderPanelProps) {
  const [draggedShortcutId, setDraggedShortcutId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"left" | "right">("left");
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number } | null>(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 40, y: 40 });
  const [initialRects, setInitialRects] = useState<Record<string, DOMRect>>({});
  const dragSourceRef = useRef<DragSource | null>(null);
  const folderGridRef = useRef<HTMLDivElement | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverIntentRef = useRef<string | null>(null);
  // Tracks whether we've already started the "drag out" sequence so we don't
  // fire onStartOutgoingDrag / onClose more than once per gesture.
  const outgoingDragStartedRef = useRef(false);
  const activePageId = tabState.pages[activeShortcutPageIndex]?.id ?? "page-1";

  const clearMoveTimer = useCallback(() => {
    if (moveTimerRef.current) {
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }
  }, []);

  const clearDrag = useCallback(() => {
    clearMoveTimer();
    setDraggedShortcutId(null);
    setDropTargetId(null);
    setOverlayPos(null);
    setOverlayOffset({ x: 40, y: 40 });
    setInitialRects({});
    dragSourceRef.current = null;
    hoverIntentRef.current = null;
    outgoingDragStartedRef.current = false;
  }, [clearMoveTimer]);

  // Track pointer position while dragging to render a custom overlay tile
  useEffect(() => {
    if (!draggedShortcutId) {
      setOverlayPos(null);
      return;
    }
    const handleMove = (e: MouseEvent) => setOverlayPos({ x: e.clientX, y: e.clientY });
    const handleEnd = () => setOverlayPos(null);
    window.addEventListener("dragover", handleMove);
    window.addEventListener("dragend", handleEnd);
    window.addEventListener("drop", handleEnd);
    return () => {
      window.removeEventListener("dragover", handleMove);
      window.removeEventListener("dragend", handleEnd);
      window.removeEventListener("drop", handleEnd);
    };
  }, [draggedShortcutId]);

  // Returns the topmost .quick-link tile on the main grid at a given viewport
  // point, bypassing the backdrop overlay (elementsFromPoint ignores z-index /
  // pointer-events for the purpose of returning all elements geometrically).
  const findGridTileBelow = useCallback((clientX: number, clientY: number): Element | null => {
    return (
      document
        .elementsFromPoint(clientX, clientY)
        .find(
          (el) =>
            el.classList.contains("quick-link") &&
            !el.classList.contains("folder-item") &&
            !el.closest(".folder-panel")
        ) ?? null
    );
  }, []);

  const updateOverlayPosition = useCallback((event: DragEvent<HTMLElement | HTMLDivElement>) => {
    setOverlayPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, shortcut: { id: string }) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setInitialRects(captureTileRects(folderGridRef.current, ".folder-item"));
      setOverlayOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      updateOverlayPosition(event);
      setDraggedShortcutId(shortcut.id);
      dragSourceRef.current = {
        kind: "folder-child",
        shortcutId: shortcut.id,
        folderId: activeFolder.id,
        pageId: activePageId,
        index: activeFolder.childIds.indexOf(shortcut.id)
      };
    },
    [activeFolder.id, activeFolder.childIds, activePageId, updateOverlayPosition]
  );

  const getChildShift = useCallback(
    (shortcutId: string) => {
      if (!draggedShortcutId || !dropTargetId || shortcutId === draggedShortcutId) {
        return emptyShift;
      }

      const sourceIndex = activeFolder.childIds.indexOf(draggedShortcutId);
      const targetIndex = activeFolder.childIds.indexOf(dropTargetId);
      const tileIndex = activeFolder.childIds.indexOf(shortcutId);

      if (sourceIndex < 0 || targetIndex < 0 || tileIndex < 0 || sourceIndex === targetIndex) {
        return emptyShift;
      }

      let shift = 0;
      // Simulate the final order with FLIP-style offsets so siblings preview the reorder before drop commit.
      if (sourceIndex < targetIndex) {
        if (dropPosition === "right" && tileIndex > sourceIndex && tileIndex <= targetIndex) shift = -1;
        if (dropPosition === "left" && tileIndex > sourceIndex && tileIndex < targetIndex) shift = -1;
      } else if (sourceIndex > targetIndex) {
        if (dropPosition === "left" && tileIndex >= targetIndex && tileIndex < sourceIndex) shift = 1;
        if (dropPosition === "right" && tileIndex > targetIndex && tileIndex < sourceIndex) shift = 1;
      }

      if (shift === 0) {
        return emptyShift;
      }

      const targetShortcutId = activeFolder.childIds[tileIndex + shift];
      return getShiftBetweenRects(initialRects[shortcutId], initialRects[targetShortcutId]);
    },
    [activeFolder.childIds, draggedShortcutId, dropPosition, dropTargetId, initialRects]
  );

  // ── Within-folder reorder ─────────────────────────────────────────────────

  const handleDropOnChild = useCallback(
    (targetShortcutId: string, position: "left" | "right") => {
      const source = dragSourceRef.current;
      if (!source || source.kind !== "folder-child") return;

      const targetIndex = activeFolder.childIds.indexOf(targetShortcutId);
      const atIndex = computeDropIndex(source.index, targetIndex, position);
      const target: DropTarget = {
        kind: "folder-child",
        folderId: activeFolder.id,
        shortcutId: targetShortcutId,
        index: atIndex, // use computed index (accounts for source removal shift)
        zone: position === "left" ? "leading" : "trailing"
      };

      dispatchDropAction(createDropAction(source, target));
      clearDrag();
    },
    [activeFolder.id, activeFolder.childIds, dispatchDropAction, clearDrag]
  );

  const getChildDropPosition = (event: DragEvent<HTMLElement>): "left" | "right" => {
    const rect = (event.currentTarget as HTMLElement).closest(".folder-item")?.getBoundingClientRect();
    if (!rect) return "left";
    return getDropPosition(event.clientX, rect) === "right" ? "right" : "left";
  };

  const scheduleDropTarget = useCallback(
    (shortcutId: string, position: "left" | "right") => {
      const intentKey = `${shortcutId}:${position}`;
      if (hoverIntentRef.current === intentKey) {
        return;
      }

      hoverIntentRef.current = intentKey;
      clearMoveTimer();
      moveTimerRef.current = setTimeout(() => {
        setDropTargetId(shortcutId);
        setDropPosition(position);
        moveTimerRef.current = null;
      }, FOLDER_REORDER_DEBOUNCE_MS);
    },
    [clearMoveTimer]
  );

  // ── Backdrop drag handlers ────────────────────────────────────────────────

  /**
   * As soon as the cursor reaches the dimmed backdrop area (outside the folder
   * panel dialog), we immediately close the folder and hand off to ShortcutGrid
   * via outgoingDragSource, matching the drag session used by the Shortcut Grid Widget.
   *
   * The outgoingDragStartedRef guard ensures we call onClose / onStartOutgoingDrag
   * only once even though dragOver fires continuously.
   */
  const handleBackdropDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!draggedShortcutId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateOverlayPosition(event);

      if (!outgoingDragStartedRef.current) {
        outgoingDragStartedRef.current = true;
        const source: DragSource = {
          kind: "folder-child",
          shortcutId: draggedShortcutId,
          folderId: activeFolder.id,
          pageId: activePageId,
          index: activeFolder.childIds.indexOf(draggedShortcutId)
        };
        onStartOutgoingDrag(source);
        onClose(); // Reveal the main grid so the user can drop precisely
      }
    },
    [draggedShortcutId, activeFolder.id, activeFolder.childIds, activePageId, onStartOutgoingDrag, onClose, updateOverlayPosition]
  );

  /**
   * Fallback: the user dropped while the backdrop was still mounted (React
   * re-render hadn't processed onClose yet).  We dispatch the correct action
   * using elementsFromPoint so we still get precise placement.
   */
  const handleBackdropDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!draggedShortcutId) return;

      const tileEl = findGridTileBelow(event.clientX, event.clientY);
      const tileKey = tileEl?.getAttribute("data-tile-key") ?? null;
      const targetPageId = activePageId;
      const targetPage = tabState.pages[activeShortcutPageIndex];

      if (tileKey) {
        const tileId = tileKey.includes(":") ? tileKey.split(":").slice(1).join(":") : tileKey;
        const tile = tabState.tiles[tileId];
        const dropPos = tileEl ? getDropPosition(event.clientX, tileEl.getBoundingClientRect()) : "right";

        if (tile?.kind === "folder" && tileId !== activeFolder.id && dropPos === "center") {
          dispatchDropAction({
            type: "ADD_TO_FOLDER",
            sourceTileId: draggedShortcutId,
            folderId: tileId
          });
        } else {
          const tileIndex = targetPage?.tileIds.indexOf(tileId) ?? -1;
          const atIndex =
            dropPos === "right"
              ? tileIndex >= 0 ? tileIndex + 1 : (targetPage?.tileIds.length ?? 0)
              : tileIndex >= 0 ? tileIndex : 0;
          dispatchDropAction({
            type: "PROMOTE",
            tileId: draggedShortcutId,
            fromFolderId: activeFolder.id,
            toPageId: targetPageId,
            toIndex: atIndex
          });
        }
      } else {
        dispatchDropAction({
          type: "PROMOTE",
          tileId: draggedShortcutId,
          fromFolderId: activeFolder.id,
          toPageId: targetPageId,
          toIndex: targetPage?.tileIds.length ?? 0
        });
      }

      // Only call onClose if the folder wasn't already closing
      if (!outgoingDragStartedRef.current) onClose();
      clearDrag();
    },
    [
      draggedShortcutId,
      activeFolder.id,
      activePageId,
      activeShortcutPageIndex,
      tabState,
      dispatchDropAction,
      onClose,
      clearDrag,
      findGridTileBelow
    ]
  );

  // Fires when cursor leaves the viewport entirely (goes to browser chrome).
  const handleBackdropDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const related = event.relatedTarget as Node | null;
      // Ignore events caused by cursor moving between child elements
      if (related && (event.currentTarget as HTMLElement).contains(related)) return;

      if (!draggedShortcutId) return;
      if (outgoingDragStartedRef.current) return; // Already handled

      // Cursor left the viewport — set outgoing source and close
      outgoingDragStartedRef.current = true;
      onStartOutgoingDrag({
        kind: "folder-child",
        shortcutId: draggedShortcutId,
        folderId: activeFolder.id,
        pageId: activePageId,
        index: activeFolder.childIds.indexOf(draggedShortcutId)
      });
      onClose();
    },
    [
      draggedShortcutId,
      activeFolder.id,
      activeFolder.childIds,
      activePageId,
      onStartOutgoingDrag,
      onClose
    ]
  );

  // ── Within-folder item drag handlers ─────────────────────────────────────

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>, shortcutId: string) => {
      if (!draggedShortcutId || shortcutId === draggedShortcutId) return;
      event.preventDefault();
      updateOverlayPosition(event);
      scheduleDropTarget(shortcutId, getChildDropPosition(event));
    },
    [draggedShortcutId, scheduleDropTarget, updateOverlayPosition]
  );

  const handleDragLeave = useCallback(() => {}, []);

  const handleChildDrop = useCallback(
    (event: DragEvent<HTMLElement>, targetShortcutId: string) => {
      event.preventDefault();
      event.stopPropagation();
      if (!draggedShortcutId || targetShortcutId === draggedShortcutId) return;
      handleDropOnChild(targetShortcutId, getChildDropPosition(event));
    },
    [draggedShortcutId, handleDropOnChild]
  );

  const handleFolderGridDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!draggedShortcutId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (dropTargetId && dropTargetId !== draggedShortcutId) {
        handleDropOnChild(dropTargetId, dropPosition);
        return;
      }

      clearDrag();
    },
    [clearDrag, draggedShortcutId, dropPosition, dropTargetId, handleDropOnChild]
  );

  return (
    <div
      className={["folder-backdrop", draggedShortcutId ? "folder-drop-target" : ""].filter(Boolean).join(" ")}
      role="presentation"
      onDragOver={handleBackdropDragOver}
      onDragLeave={handleBackdropDragLeave}
      onDrop={handleBackdropDrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="folder-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-panel-title"
        onDragOver={(event) => {
          if (draggedShortcutId) {
            event.preventDefault();
            event.stopPropagation();
            updateOverlayPosition(event);
          }
        }}
        onDrop={(event) => {
          if (draggedShortcutId) {
            event.preventDefault();
            event.stopPropagation();
            if (dropTargetId && dropTargetId !== draggedShortcutId) {
              handleDropOnChild(dropTargetId, dropPosition);
            }
          }
        }}
      >
        <div className="folder-header">
          <div>
            <h1 id="folder-panel-title">{activeFolder.title}</h1>
            <span>{activeFolder.shortcuts.length} shortcuts</span>
          </div>
          <div className="folder-actions">
            <button className="secondary-button" type="button" onClick={() => onEditFolder(activeFolder)}>
              Edit
            </button>
            <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
              x
            </button>
          </div>
        </div>

        <div className="folder-grid" ref={folderGridRef} onDrop={handleFolderGridDrop}>
          {activeFolder.shortcuts.map((shortcut) => {
            const shift = getChildShift(shortcut.id);
            const shiftStyle = shift.x !== 0 || shift.y !== 0 ? { transform: `translate(${shift.x}px, ${shift.y}px)` } : {};

            return (
            <a
              className={[
                "quick-link",
                "folder-item",
                draggedShortcutId === shortcut.id ? "dragging-origin" : "",
                dropTargetId === shortcut.id ? (dropPosition === "left" ? "drop-leading" : "drop-trailing") : ""
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={true}
              data-tile-key={shortcut.id}
              href={shortcut.url}
              key={shortcut.id}
              onDragEnd={clearDrag}
              onDragStart={(event) => {
                handleDragStart(event, { id: shortcut.id });
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", shortcut.id);
                hideNativeDragImage(event.dataTransfer);
              }}
              onDragEnter={(event) => handleDragEnter(event, shortcut.id)}
              onDragLeave={handleDragLeave}
              onDragOver={(event) => {
                if (draggedShortcutId && shortcut.id !== draggedShortcutId) {
                  event.preventDefault();
                  updateOverlayPosition(event);
                  scheduleDropTarget(shortcut.id, getChildDropPosition(event));
                }
              }}
              onDrop={(event) => handleChildDrop(event, shortcut.id)}
              style={shiftStyle}
            >
              <ShortcutIcon shortcut={shortcut} />
              <span className="quick-link-title">{shortcut.title}</span>
              <button
                className="quick-link-edit"
                type="button"
                aria-label={`Edit ${shortcut.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  onEditShortcut(shortcut);
                }}
              >
                Edit
              </button>
            </a>
          );
          })}
        </div>
      </section>

      {/* Custom drag overlay — tile follows the cursor while dragging within the folder */}
      {draggedShortcutId && overlayPos && (() => {
        const tile = tabState.tiles[draggedShortcutId];
        if (!tile || tile.kind !== "shortcut") return null;
        return (
          <div
            className="drag-overlay-tile"
            style={{
              position: "fixed",
              left: overlayPos.x - overlayOffset.x,
              top: overlayPos.y - overlayOffset.y,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <ShortcutIcon shortcut={tile} />
            <span className="quick-link-title">{tile.title}</span>
          </div>
        );
      })()}
    </div>
  );
}
