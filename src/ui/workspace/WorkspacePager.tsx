import { useState } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";
import { getAdjacentWorkspacePageId, getWorkspacePageIndex } from "../../domain/workspaceNavigation";
import type { WorkspaceLayout } from "../../domain/workspace";
import type { WorkspaceItemRenderers } from "./WorkspaceItemRenderer";
import { WorkspacePageHost } from "./WorkspacePageHost";

export type WorkspacePagerPage = {
  id: string;
  label?: string;
  items: ResolvedWorkspaceItem[];
};

export type WorkspacePagerProps = {
  pages: WorkspacePagerPage[];
  columns: number;
  rows: number;
  editMode: boolean;
  renderers: WorkspaceItemRenderers;
  activePageId?: string;
  defaultActivePageId?: string;
  onActivePageChange?: (pageId: string) => void;
  onItemDragStart?: (itemId: ResolvedWorkspaceItem["id"]) => void;
  onItemDragCancel?: () => void;
  onItemDrop?: (draggedItemId: ResolvedWorkspaceItem["id"], targetItemId: ResolvedWorkspaceItem["id"], targetPageId: string) => void;
  onItemDropOnPage?: (draggedItemId: ResolvedWorkspaceItem["id"], targetPageId: string) => void;
  onItemKeyboardMove?: (itemId: ResolvedWorkspaceItem["id"], targetPageId: string, columnDelta: number, rowDelta: number) => void;
};

/**
 * Accessible multi-page shell for the shared workspace renderer.
 * Active page can be controlled by the app or managed locally during migration.
 */
export function WorkspacePager({
  activePageId,
  columns,
  defaultActivePageId,
  editMode,
  onActivePageChange,
  onItemDragStart,
  onItemDragCancel,
  onItemDrop,
  onItemDropOnPage,
  onItemKeyboardMove,
  pages,
  renderers,
  rows
}: WorkspacePagerProps) {
  const [internalActivePageId, setInternalActivePageId] = useState(
    defaultActivePageId ?? pages[0]?.id ?? ""
  );
  const navigationLayout: WorkspaceLayout = {
    schemaVersion: 1,
    pages: pages.map(({ id }) => ({ id, itemIds: [] })),
    placements: {}
  };
  const requestedActivePageId = activePageId ?? internalActivePageId;
  const requestedIndex = getWorkspacePageIndex(navigationLayout, requestedActivePageId);
  // Page lists can change during migration or after an external state update.
  // A stale active ID should recover to the first available page, not blank the pager.
  const activeIndex = requestedIndex < 0 ? (pages.length > 0 ? 0 : -1) : requestedIndex;
  const activePage = activeIndex < 0 ? undefined : pages[activeIndex];
  const resolvedActivePageId = activePage?.id ?? "";
  const previousPageId = getAdjacentWorkspacePageId(navigationLayout, resolvedActivePageId, "previous");
  const nextPageId = getAdjacentWorkspacePageId(navigationLayout, resolvedActivePageId, "next");

  const selectPage = (pageId: string | null) => {
    if (!pageId || pageId === resolvedActivePageId) {
      return;
    }
    if (activePageId === undefined) {
      setInternalActivePageId(pageId);
    }
    onActivePageChange?.(pageId);
  };

  if (!activePage) {
    return (
      <section aria-label="Launcher workspace" className="workspace-pager workspace-pager-empty">
        <p>No workspace pages</p>
      </section>
    );
  }

  return (
    <div className="workspace-pager" data-workspace-active-page={activePage.id}>
      <nav aria-label="Workspace pages" className="workspace-pager-navigation">
        <button
          type="button"
          aria-label="Previous workspace page"
          disabled={!previousPageId || previousPageId === activePage.id}
          onClick={() => selectPage(previousPageId)}
          onDragOver={(event) => { if (onItemDropOnPage && previousPageId && previousPageId !== activePage.id) event.preventDefault(); }}
          onDrop={(event) => {
            if (!onItemDropOnPage || !previousPageId || previousPageId === activePage.id) return;
            event.preventDefault();
            const draggedItemId = event.dataTransfer.getData("text/plain");
            if (draggedItemId) {
              onItemDropOnPage(draggedItemId as ResolvedWorkspaceItem["id"], previousPageId);
              selectPage(previousPageId);
            }
          }}
        >
          Previous
        </button>
        <span aria-live="polite" className="workspace-pager-indicator">
          {activePage.label ?? activePage.id} ({activeIndex + 1} of {pages.length})
        </span>
        <button
          type="button"
          aria-label="Next workspace page"
          disabled={!nextPageId || nextPageId === activePage.id}
          onClick={() => selectPage(nextPageId)}
          onDragOver={(event) => { if (onItemDropOnPage && nextPageId && nextPageId !== activePage.id) event.preventDefault(); }}
          onDrop={(event) => {
            if (!onItemDropOnPage || !nextPageId || nextPageId === activePage.id) return;
            event.preventDefault();
            const draggedItemId = event.dataTransfer.getData("text/plain");
            if (draggedItemId) {
              onItemDropOnPage(draggedItemId as ResolvedWorkspaceItem["id"], nextPageId);
              selectPage(nextPageId);
            }
          }}
        >
          Next
        </button>
      </nav>
      <WorkspacePageHost
        columns={columns}
        editMode={editMode}
        items={activePage.items}
        renderers={renderers}
        rows={rows}
        onItemDragStart={onItemDragStart}
        onItemDragCancel={onItemDragCancel}
        onItemDrop={(draggedItemId, targetItemId) => onItemDrop?.(draggedItemId, targetItemId, activePage.id)}
        onItemDropOnPage={(draggedItemId) => onItemDropOnPage?.(draggedItemId, activePage.id)}
        onItemKeyboardMove={(itemId, columnDelta, rowDelta) => onItemKeyboardMove?.(itemId, activePage.id, columnDelta, rowDelta)}
      />
    </div>
  );
}
