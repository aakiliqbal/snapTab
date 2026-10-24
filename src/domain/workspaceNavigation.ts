import type { WorkspaceLayout } from "./workspace";

export type WorkspacePageDirection = "previous" | "next";

/**
 * Resolves an active page safely when pages are deleted or stale UI state is
 * retained across tabs. Empty layouts resolve to index -1.
 */
export function getWorkspacePageIndex(layout: WorkspaceLayout, activePageId: string): number {
  if (layout.pages.length === 0) {
    return -1;
  }

  const index = layout.pages.findIndex((page) => page.id === activePageId);
  return index >= 0 ? index : 0;
}

/**
 * Returns the adjacent page ID without wrapping. At either edge, navigation
 * stays on the current page; a stale active page resolves to the first page.
 */
export function getAdjacentWorkspacePageId(
  layout: WorkspaceLayout,
  activePageId: string,
  direction: WorkspacePageDirection
): string | null {
  const currentIndex = getWorkspacePageIndex(layout, activePageId);
  if (currentIndex < 0) {
    return null;
  }

  const offset = direction === "next" ? 1 : -1;
  const targetIndex = Math.max(0, Math.min(layout.pages.length - 1, currentIndex + offset));
  return layout.pages[targetIndex].id;
}
