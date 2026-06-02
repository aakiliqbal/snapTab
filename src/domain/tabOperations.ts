import { produce } from "immer";
import { brandIcons, matchBrandIcon, type BrandIcon } from "./brandIcons";
import { runFolderCleanup } from "./dropActions";
import { compactShortcutPages, type Folder, type Shortcut, type TabState, type TileId } from "./tabState";
import type { FolderEditDraft, ShortcutDraft } from "./drafts";

export type ResolvedFolder = Folder & {
  shortcuts: Shortcut[];
};

export type ResolvedTopLevelTile =
  | {
      key: string;
      type: "shortcut";
      shortcut: Shortcut;
    }
  | {
      key: string;
      type: "folder";
      folder: ResolvedFolder;
    };

export function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function createShortcutFromDraft(draft: ShortcutDraft): Shortcut | null {
  const title = draft.title.trim();
  const url = normalizeUrl(draft.url);

  if (!title || !url) {
    return null;
  }

  const iconLabel = (draft.iconLabel.trim() || title.slice(0, 1) || "?").slice(0, 2).toUpperCase();
  const matchedBrandIcon = draft.iconImageDataUrl
    ? null
    : draft.brandIconId
      ? brandIcons[draft.brandIconId]
      : draft.id
        ? null
        : matchBrandIcon(title, url);

  return {
    kind: "shortcut",
    id: draft.id ?? crypto.randomUUID(),
    title,
    url,
    icon: {
      type: draft.iconImageDataUrl ? "image" : matchedBrandIcon ? "brand" : "fallback",
      label: matchedBrandIcon ? matchedBrandIcon.title.slice(0, 2).toUpperCase() : iconLabel,
      background: matchedBrandIcon ? `#${matchedBrandIcon.hex}` : draft.iconBackground,
      imageDataUrl: draft.iconImageDataUrl,
      imageMediaId: draft.iconMediaId,
      brandIconId: matchedBrandIcon?.id ?? null
    }
  };
}

export function updateFolderFromDraft(state: TabState, draft: FolderEditDraft): Folder | null {
  const title = draft.title.trim();

  if (!title) {
    return null;
  }

  const iconLabel = (draft.iconLabel.trim() || title.slice(0, 1) || "?").slice(0, 2).toUpperCase();
  const existing = getFolder(state, draft.id);

  if (!existing) {
    return null;
  }

  return {
    kind: "folder",
    id: draft.id,
    title,
    icon: {
      type: "fallback",
      label: iconLabel,
      background: draft.iconBackground
    },
    childIds: existing.childIds
  };
}

export function upsertShortcut(state: TabState, shortcut: Shortcut, draft: ShortcutDraft): TabState {
  if (draft.folderId) {
    return {
      ...state,
      tiles: {
        ...state.tiles,
        [shortcut.id]: shortcut,
        [draft.folderId]: updateFolderChildren(state, draft.folderId, (childIds) =>
          draft.id ? childIds : [...childIds, shortcut.id]
        )
      }
    };
  }

  return {
    ...state,
    tiles: {
      ...state.tiles,
      [shortcut.id]: shortcut
    },
    pages: draft.id ? state.pages : appendTileToLastPage(state.pages, shortcut.id)
  };
}

export function deleteShortcutFromState(state: TabState, draft: ShortcutDraft): TabState {
  if (!draft.id) {
    return state;
  }

  return produce(state, (nextState) => {
    delete nextState.tiles[draft.id!];

    for (const page of nextState.pages) {
      removeTileId(page.tileIds, draft.id!);
    }

    const changedFolderIds: TileId[] = [];
    for (const tile of Object.values(nextState.tiles)) {
      if (tile.kind !== "folder") {
        continue;
      }

      const previousLength = tile.childIds.length;
      removeTileId(tile.childIds, draft.id!);
      if (tile.childIds.length !== previousLength) {
        changedFolderIds.push(tile.id);
      }
    }

    for (const folderId of changedFolderIds) {
      runFolderCleanup(nextState, folderId);
    }

    nextState.pages = compactShortcutPages(nextState.pages);
  });
}

export function updateFolder(state: TabState, folder: Folder): TabState {
  return {
    ...state,
    tiles: {
      ...state.tiles,
      [folder.id]: folder
    }
  };
}

export function deleteFolderFromState(state: TabState, folderId: string): TabState {
  return produce(state, (nextState) => {
    const folder = nextState.tiles[folderId];
    if (folder?.kind !== "folder") {
      return;
    }

    for (const childId of folder.childIds) {
      delete nextState.tiles[childId];
    }
    delete nextState.tiles[folderId];

    for (const page of nextState.pages) {
      removeTileId(page.tileIds, folderId);
    }

    nextState.pages = compactShortcutPages(nextState.pages);
  });
}

export function resolveTopLevelTiles(state: TabState): ResolvedTopLevelTile[] {
  return state.pages.flatMap((page) =>
    page.tileIds.flatMap<ResolvedTopLevelTile>((tileId) => {
      const tile = state.tiles[tileId];

      if (!tile) {
        return [];
      }

      if (tile.kind === "shortcut") {
        return [{ key: getTopLevelTileKey(tile), type: "shortcut", shortcut: tile }];
      }

      return [{ key: getTopLevelTileKey(tile), type: "folder", folder: resolveFolder(state, tile) }];
    })
  );
}

export function resolveShortcutPageTiles(state: TabState, pageIndex: number): ResolvedTopLevelTile[] {
  const page = state.pages[pageIndex];

  if (!page) {
    return [];
  }

  return page.tileIds.flatMap<ResolvedTopLevelTile>((tileId) => {
    const tile = state.tiles[tileId];

    if (!tile) {
      return [];
    }

    if (tile.kind === "shortcut") {
      return [{ key: getTopLevelTileKey(tile), type: "shortcut", shortcut: tile }];
    }

    return [{ key: getTopLevelTileKey(tile), type: "folder", folder: resolveFolder(state, tile) }];
  });
}

export function resolveActiveFolder(state: TabState, folderId: string | null): ResolvedFolder | null {
  if (!folderId) {
    return null;
  }

  const folder = getFolder(state, folderId);
  return folder ? resolveFolder(state, folder) : null;
}

export function moveTopLevelTileInState(state: TabState, draggedKey: string, targetKey: string): TabState {
  if (draggedKey === targetKey) {
    return state;
  }

  const draggedId = getIdFromTopLevelTileKey(draggedKey);
  const targetId = getIdFromTopLevelTileKey(targetKey);
  const fromPageIndex = state.pages.findIndex((page) => page.tileIds.includes(draggedId));
  const toPageIndex = state.pages.findIndex((page) => page.tileIds.includes(targetId));

  if (fromPageIndex < 0 || toPageIndex < 0) {
    return state;
  }

  const pages = state.pages.map((page) => ({ ...page, tileIds: [...page.tileIds] }));
  const fromIndex = pages[fromPageIndex].tileIds.indexOf(draggedId);
  const toIndex = pages[toPageIndex].tileIds.indexOf(targetId);
  const [movedTileId] = pages[fromPageIndex].tileIds.splice(fromIndex, 1);
  pages[toPageIndex].tileIds.splice(toIndex, 0, movedTileId);

  return { ...state, pages: compactShortcutPages(pages) };
}

export function applyRecommendedIcon(draft: ShortcutDraft, icon: BrandIcon): ShortcutDraft {
  return {
    ...draft,
    iconImageDataUrl: null,
    iconMediaId: null,
    brandIconId: icon.id,
    iconBackground: `#${icon.hex}`,
    iconLabel: icon.title.slice(0, 2).toUpperCase()
  };
}

export function getShortcutPageIndex(state: TabState, tileId: TileId) {
  return state.pages.findIndex((page) => page.tileIds.includes(tileId));
}

function resolveFolder(state: TabState, folder: Folder): ResolvedFolder {
  return {
    ...folder,
    shortcuts: folder.childIds.flatMap((childId) => {
      const child = state.tiles[childId];
      return child?.kind === "shortcut" ? [child] : [];
    })
  };
}

function getFolder(state: TabState, folderId: TileId): Folder | null {
  const tile = state.tiles[folderId];
  return tile?.kind === "folder" ? tile : null;
}

function updateFolderChildren(state: TabState, folderId: TileId, update: (childIds: TileId[]) => TileId[]): Folder {
  const folder = getFolder(state, folderId);

  if (!folder) {
    throw new Error(`Folder ${folderId} does not exist`);
  }

  return {
    ...folder,
    childIds: update(folder.childIds)
  };
}

function appendTileToLastPage(pages: TabState["pages"], tileId: TileId): TabState["pages"] {
  const nextPages = pages.length > 0 ? pages.map((page) => ({ ...page, tileIds: [...page.tileIds] })) : [{ id: "page-1", tileIds: [] }];
  nextPages[nextPages.length - 1].tileIds.push(tileId);
  return nextPages;
}

function removeTileId(tileIds: TileId[], tileId: TileId) {
  const index = tileIds.indexOf(tileId);
  if (index >= 0) {
    tileIds.splice(index, 1);
  }
}

function getTopLevelTileKey(tile: Shortcut | Folder) {
  return `${tile.kind}:${tile.id}`;
}

function getIdFromTopLevelTileKey(key: string) {
  return key.includes(":") ? key.split(":").slice(1).join(":") : key;
}
