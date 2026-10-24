import type { WorkspaceGridPlacement, WorkspaceItemId, WorkspaceLayout } from "./workspace";
import { moveWorkspaceItem, setWorkspaceItemPlacement } from "./workspaceOperations";
import { findWorkspacePlacement, type WorkspaceGridMetrics } from "./workspaceLayout";

export type WorkspaceDragSession = {
  itemId: WorkspaceItemId;
  sourcePageId: string;
  sourcePlacement: WorkspaceGridPlacement;
  targetPageId: string;
  targetIndex: number | null;
  previewPlacement: WorkspaceGridPlacement;
  active: boolean;
};

export function beginWorkspaceDrag(
  layout: WorkspaceLayout,
  itemId: WorkspaceItemId
): WorkspaceDragSession | null {
  const page = layout.pages.find((candidate) => candidate.itemIds.includes(itemId));
  if (!page) {
    return null;
  }

  const placement = layout.placements[itemId] ?? {
    column: 0,
    row: 0,
    columnSpan: 1,
    rowSpan: 1,
    zIndex: 1
  };

  return {
    itemId,
    sourcePageId: page.id,
    sourcePlacement: { ...placement },
    targetPageId: page.id,
    targetIndex: page.itemIds.indexOf(itemId),
    previewPlacement: { ...placement },
    active: true
  };
}

export function updateWorkspaceDragTarget(
  session: WorkspaceDragSession,
  targetPageId: string,
  targetIndex: number | null,
  previewPlacement?: WorkspaceGridPlacement
): WorkspaceDragSession {
  if (!session.active) {
    return session;
  }

  return {
    ...session,
    targetPageId,
    targetIndex,
    previewPlacement: previewPlacement ? { ...previewPlacement } : session.previewPlacement
  };
}

export function cancelWorkspaceDrag(session: WorkspaceDragSession): WorkspaceDragSession {
  return { ...session, active: false, previewPlacement: { ...session.sourcePlacement } };
}

export function commitWorkspaceDrag(
  layout: WorkspaceLayout,
  session: WorkspaceDragSession,
  metrics?: WorkspaceGridMetrics
): WorkspaceLayout {
  if (!session.active || !layout.pages.some((page) => page.id === session.targetPageId)) {
    return layout;
  }

  const moved = moveWorkspaceItem(layout, session.itemId, {
    pageId: session.targetPageId,
    index: session.targetIndex ?? undefined
  });

  if (!metrics) {
    return setWorkspaceItemPlacement(moved, session.itemId, session.previewPlacement);
  }

  const resolvedPlacement = findWorkspacePlacement(
    moved,
    session.targetPageId,
    session.itemId,
    session.previewPlacement,
    metrics
  );

  // A full destination page must not partially commit the page move.
  if (!resolvedPlacement) {
    return layout;
  }

  return setWorkspaceItemPlacement(moved, session.itemId, resolvedPlacement);
}
