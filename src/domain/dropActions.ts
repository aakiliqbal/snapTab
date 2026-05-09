import type { Draft } from "immer";
import type { Folder, ShortcutPage, TabState, TileId } from "./tabState";

export type DropZone = "leading" | "center" | "trailing";

export type DropAction =
  | {
      type: "REORDER";
      tileId: TileId;
      targetPageId: string;
      toIndex: number;
    }
  | {
      type: "COMBINE";
      sourceTileId: TileId;
      targetTileId: TileId;
      targetPageId: string;
      folderId?: TileId;
    }
  | {
      type: "ADD_TO_FOLDER";
      sourceTileId: TileId;
      folderId: TileId;
      atIndex?: number;
    }
  | {
      type: "CROSS_PAGE";
      tileId: TileId;
      fromPageId: string;
      toPageId: string;
      toIndex: number;
    }
  | {
      type: "PROMOTE";
      tileId: TileId;
      fromFolderId: TileId;
      toPageId: string;
      toIndex: number;
    }
  | {
      type: "CANCEL";
    };

export type ResolveDropInput = {
  activeId: TileId;
  overId: TileId | "surface" | null;
  overZone: DropZone | null;
  sourcePageId: string;
  sourceFolderId?: TileId;
  previewPageId?: string;
  toIndex?: number;
};

export function applyDropAction(state: Draft<TabState>, action: DropAction): void {
  switch (action.type) {
    case "REORDER": {
      removeTileFromPages(state.pages, action.tileId);
      insertTileIntoPage(state, action.targetPageId, action.tileId, action.toIndex);
      compactPages(state.pages);
      return;
    }
    case "COMBINE": {
      const source = state.tiles[action.sourceTileId];
      const target = state.tiles[action.targetTileId];
      const targetPage = getPage(state.pages, action.targetPageId);

      if (!source || !target || source.kind !== "shortcut" || target.kind !== "shortcut" || !targetPage) {
        return;
      }

      const targetIndex = targetPage.tileIds.indexOf(action.targetTileId);
      const sourceIndex = targetPage.tileIds.indexOf(action.sourceTileId);
      const sourceFolderId = findParentFolderId(state, action.sourceTileId);

      if (targetIndex < 0 || (sourceIndex < 0 && !sourceFolderId)) {
        return;
      }

      const insertIndex = sourceIndex >= 0 && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const folderId = action.folderId ?? crypto.randomUUID();
      removeTileFromPages(state.pages, action.sourceTileId);
      removeTileFromPages(state.pages, action.targetTileId);
      removeTileFromFolders(state, action.sourceTileId);
      state.tiles[folderId] = {
        kind: "folder",
        id: folderId,
        title: "Folder",
        icon: {
          type: "fallback",
          label: "F",
          background: "#64748b"
        },
        childIds: [action.sourceTileId, action.targetTileId]
      };
      insertTileIntoPage(state, action.targetPageId, folderId, insertIndex);
      if (sourceFolderId) {
        runFolderCleanup(state, sourceFolderId);
      }
      compactPages(state.pages);
      return;
    }
    case "ADD_TO_FOLDER": {
      const folder = getFolder(state, action.folderId);
      const source = state.tiles[action.sourceTileId];

      if (!folder || !source || source.kind !== "shortcut" || action.sourceTileId === action.folderId) {
        return;
      }

      const sourceFolderId = findParentFolderId(state, action.sourceTileId);
      removeTileFromPages(state.pages, action.sourceTileId);
      removeTileFromFolders(state, action.sourceTileId);
      insertTileId(folder.childIds, action.sourceTileId, action.atIndex ?? folder.childIds.length);

      if (sourceFolderId && sourceFolderId !== action.folderId) {
        runFolderCleanup(state, sourceFolderId);
      }
      compactPages(state.pages);
      return;
    }
    case "CROSS_PAGE": {
      if (!state.tiles[action.tileId]) {
        return;
      }

      const fromPage = getPage(state.pages, action.fromPageId);
      if (fromPage) {
        removeTileId(fromPage.tileIds, action.tileId);
      }
      insertTileIntoPage(state, action.toPageId, action.tileId, action.toIndex);
      compactPages(state.pages);
      return;
    }
    case "PROMOTE": {
      const folder = getFolder(state, action.fromFolderId);

      if (!folder || !state.tiles[action.tileId]) {
        return;
      }

      removeTileId(folder.childIds, action.tileId);
      runFolderCleanup(state, action.fromFolderId);
      insertTileIntoPage(state, action.toPageId, action.tileId, action.toIndex);
      compactPages(state.pages);
      return;
    }
    case "CANCEL":
      return;
  }
}

export function runFolderCleanup(state: Draft<TabState>, folderId: TileId): void {
  const folder = getFolder(state, folderId);

  if (!folder || folder.childIds.length >= 2) {
    return;
  }

  const remainingChildId = folder.childIds[0];
  const page = state.pages.find((candidate) => candidate.tileIds.includes(folderId));
  const folderIndex = page?.tileIds.indexOf(folderId) ?? -1;

  if (page) {
    removeTileId(page.tileIds, folderId);
    if (remainingChildId) {
      insertTileId(page.tileIds, remainingChildId, folderIndex);
    }
  }

  delete state.tiles[folderId];
}

export function resolveDrop(state: TabState, input: ResolveDropInput): DropAction {
  if (!input.overId) {
    return { type: "CANCEL" };
  }

  if (input.sourceFolderId && input.overId === "surface") {
    return {
      type: "PROMOTE",
      tileId: input.activeId,
      fromFolderId: input.sourceFolderId,
      toPageId: input.previewPageId ?? input.sourcePageId,
      toIndex: input.toIndex ?? getPageTileCount(state, input.previewPageId ?? input.sourcePageId)
    };
  }

  if (input.previewPageId) {
    return {
      type: "CROSS_PAGE",
      tileId: input.activeId,
      fromPageId: input.sourcePageId,
      toPageId: input.previewPageId,
      toIndex: input.toIndex ?? getPageTileCount(state, input.previewPageId)
    };
  }

  const activeTile = state.tiles[input.activeId];
  const overTile = input.overId === "surface" ? null : state.tiles[input.overId];

  if (!activeTile || !overTile) {
    return { type: "CANCEL" };
  }

  const targetPageId = findPageId(state, input.overId) ?? input.sourcePageId;
  const targetIndex = computeInsertIndex(state, input.overId, input.overZone, input.toIndex);

  if (input.overZone === "center" && activeTile.kind === "shortcut") {
    if (overTile.kind === "shortcut") {
      return {
        type: "COMBINE",
        sourceTileId: input.activeId,
        targetTileId: input.overId,
        targetPageId
      };
    }

    return {
      type: "ADD_TO_FOLDER",
      sourceTileId: input.activeId,
      folderId: input.overId
    };
  }

  return {
    type: "REORDER",
    tileId: input.activeId,
    targetPageId,
    toIndex: targetIndex
  };
}

function computeInsertIndex(state: TabState, overId: TileId, zone: DropZone | null, explicitIndex?: number) {
  if (typeof explicitIndex === "number") {
    return explicitIndex;
  }

  const page = state.pages.find((candidate) => candidate.tileIds.includes(overId));
  const overIndex = page?.tileIds.indexOf(overId) ?? 0;
  return zone === "trailing" ? overIndex + 1 : overIndex;
}

function findPageId(state: TabState, tileId: TileId) {
  return state.pages.find((page) => page.tileIds.includes(tileId))?.id ?? null;
}

function getPageTileCount(state: TabState, pageId: string) {
  return state.pages.find((page) => page.id === pageId)?.tileIds.length ?? 0;
}

function getFolder(state: Draft<TabState>, folderId: TileId): Draft<Folder> | null {
  const tile = state.tiles[folderId];
  return tile?.kind === "folder" ? tile : null;
}

function findParentFolderId(state: Draft<TabState>, tileId: TileId) {
  return Object.values(state.tiles).find((tile) => tile.kind === "folder" && tile.childIds.includes(tileId))?.id ?? null;
}

function getPage(pages: Draft<ShortcutPage[]>, pageId: string) {
  return pages.find((page) => page.id === pageId) ?? null;
}

function removeTileFromPages(pages: Draft<ShortcutPage[]>, tileId: TileId) {
  for (const page of pages) {
    removeTileId(page.tileIds, tileId);
  }
}

function removeTileFromFolders(state: Draft<TabState>, tileId: TileId) {
  for (const tile of Object.values(state.tiles)) {
    if (tile.kind === "folder") {
      removeTileId(tile.childIds, tileId);
    }
  }
}

function insertTileIntoPage(state: Draft<TabState>, pageId: string, tileId: TileId, index: number) {
  const page = getPage(state.pages, pageId);
  if (!page) {
    return;
  }

  insertTileId(page.tileIds, tileId, index);
  shiftPageOverflow(state.pages, pageId, getShortcutPageCapacity(state));
}

function shiftPageOverflow(pages: Draft<ShortcutPage[]>, pageId: string, capacity: number) {
  if (capacity < 1) {
    return;
  }

  let pageIndex = pages.findIndex((page) => page.id === pageId);
  while (pageIndex >= 0 && pageIndex < pages.length && pages[pageIndex].tileIds.length > capacity) {
    const overflowTileId = pages[pageIndex].tileIds.pop();
    if (!overflowTileId) {
      return;
    }

    const nextPage = pages[pageIndex + 1] ?? { id: `page-${pageIndex + 2}`, tileIds: [] };
    nextPage.tileIds.unshift(overflowTileId);
    pages[pageIndex + 1] = nextPage;
    pageIndex += 1;
  }
}

function getShortcutPageCapacity(state: Draft<TabState>) {
  return state.layout.gridLayout.rows * state.layout.gridLayout.columns;
}

function insertTileId(tileIds: Draft<TileId[]>, tileId: TileId, index: number) {
  removeTileId(tileIds, tileId);
  tileIds.splice(Math.max(0, Math.min(index, tileIds.length)), 0, tileId);
}

function removeTileId(tileIds: Draft<TileId[]>, tileId: TileId) {
  const index = tileIds.indexOf(tileId);
  if (index >= 0) {
    tileIds.splice(index, 1);
  }
}

function compactPages(pages: Draft<ShortcutPage[]>) {
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    if (pages.length > 1 && pages[index].tileIds.length === 0) {
      pages.splice(index, 1);
    }
  }
}
