import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { brandIcons } from "../../../domain/brandIcons";
import type { DropAction } from "../../../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../../../domain/tabOperations";
import type { Shortcut, TabState } from "../../../domain/tabState";
import type { DragSource } from "../../drag/dragModel";
import { ShortcutIcon } from "./shortcuts";
import { getTilePagePosition, type ShortcutPageItem } from "./shortcutPageModel";
import { useGridDragSession } from "./useGridDragSession";

type ShortcutGridProps = {
  activeShortcutPageIndex: number;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: React.RefObject<HTMLElement | null>;
  outgoingDragSource: DragSource | null;
  onClearOutgoingDrag: () => void;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  onSetActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  pageCapacity: number;
  pageCount: number;
  showPageDots?: boolean;
  showLabels: boolean;
  tabState: TabState;
  visibleShortcutPageItems: ShortcutPageItem[];
};

export function ShortcutGrid({
  activeShortcutPageIndex,
  dispatchDropAction,
  gridRef,
  outgoingDragSource,
  onClearOutgoingDrag,
  onEditFolder,
  onEditShortcut,
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
  const dragSession = useGridDragSession({
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
  });

  const { dragState, dropTargetKey, confirmedZone, dropPosition, isCombinePreview, activePageEdge, pageEdgeStyle, onTileDragStart, onTileDragOver, onTileDragLeave, onTileDrop, onTileDragEnd, onGridDragEnter, onGridDragOver, onGridDrop, getTileShift } = dragSession;

  const effectiveZone = confirmedZone ?? dropPosition;
  const hasDragSession = dragState !== null || outgoingDragSource !== null;

  return (
    <>
      {pageCount > 1 && pageEdgeStyle && hasDragSession ? (
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
        onDragEnter={onGridDragEnter}
        onDragOver={onGridDragOver}
        onDrop={onGridDrop}
      >
        {visibleShortcutPageItems.map((tile: ShortcutPageItem, index: number) => {
          const shift = getTileShift(tile.key);
          const tileShiftStyle = (shift.x !== 0 || shift.y !== 0) ? {
            transform: `translate(${shift.x}px, ${shift.y}px)`,
            transition: reducedMotion ? 'none' : 'transform 100ms ease-out'
          } : {};

          const isDragging = dragState?.sourceKey === tile.key;
          const isDropTarget = dropTargetKey === tile.key;

          let tileClassName = [
            "quick-link",
            tile.type === "folder" ? "folder-link" : "",
            isDragging ? "dragging-origin" : "",
            isDropTarget && effectiveZone === "center" ? "drop-center" : "",
            isDropTarget && effectiveZone === "left" ? "drop-leading" : "",
            isDropTarget && effectiveZone === "right" ? "drop-trailing" : "",
            isCombinePreview ? "combine-preview" : ""
          ].filter(Boolean).join(" ");

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
                onDragStart={(e) => onTileDragStart(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
                onDragOver={(e) => onTileDragOver(e as unknown as React.DragEvent<HTMLElement>, tile.key)}
                onDragLeave={(e) => onTileDragLeave(e as unknown as React.DragEvent<HTMLElement>)}
                onDrop={(e) => onTileDrop(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
                onDragEnd={(e) => onTileDragEnd(e as unknown as React.DragEvent<HTMLElement>)}
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
              onDragStart={(e) => onTileDragStart(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
              onDragOver={(e) => onTileDragOver(e as unknown as React.DragEvent<HTMLElement>, tile.key)}
              onDragLeave={(e) => onTileDragLeave(e as unknown as React.DragEvent<HTMLElement>)}
              onDrop={(e) => onTileDrop(e as unknown as React.DragEvent<HTMLElement>, tile.key, index)}
              onDragEnd={(e) => onTileDragEnd(e as unknown as React.DragEvent<HTMLElement>)}
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

      {dragSession.dragOverlay && Number.isFinite(dragSession.dragOverlay.x) && Number.isFinite(dragSession.dragOverlay.y) && (
        <div
          className={["drag-overlay-tile", isCombinePreview ? "merge-active" : ""].filter(Boolean).join(" ")}
          style={{
            position: 'fixed',
            left: dragSession.dragOverlay.x - 40,
            top: dragSession.dragOverlay.y - 40,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <TileContent tile={dragSession.dragOverlay.tile} showLabels={showLabels} />
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
      <span className="quick-link-icon folder-icon folder-preview-icon" aria-hidden="true">
        <span className="folder-preview-grid">
          {tile.folder.shortcuts.slice(0, 9).map((shortcut) => (
            <span className="folder-preview-child" key={shortcut.id} style={{ backgroundColor: shortcut.icon.background }}>
              {renderFolderPreviewChild(shortcut)}
            </span>
          ))}
        </span>
      </span>
      {showLabels ? <span className="quick-link-title">{tile.folder.title}</span> : null}
    </>
  );
}

function renderFolderPreviewChild(shortcut: Shortcut) {
  const brandIcon = shortcut.icon.type === "brand" && shortcut.icon.brandIconId ? brandIcons[shortcut.icon.brandIconId] : null;

  if (shortcut.icon.type === "image" && shortcut.icon.imageDataUrl) {
    return <img src={shortcut.icon.imageDataUrl} alt="" />;
  }

  if (brandIcon) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={brandIcon.path} />
      </svg>
    );
  }

  return shortcut.icon.label.slice(0, 1);
}