import type { DropAction } from "../../domain/dropActions";
import type { DragSource, DropTarget } from "./dragModel";

export function createDropAction(source: DragSource, target: DropTarget | null): DropAction {
  if (!target || target.kind === "page-edge") {
    return { type: "CANCEL" };
  }

  if (source.kind === "folder-child") {
    return createFolderChildDropAction(source, target);
  }

  return createTopLevelDropAction(source, target);
}

function createTopLevelDropAction(source: Extract<DragSource, { kind: "top-level" }>, target: DropTarget): DropAction {
  if (target.kind === "top-level-tile") {
    if (source.pageId !== target.pageId) {
      return {
        type: "CROSS_PAGE",
        tileId: source.tileId,
        fromPageId: source.pageId,
        toPageId: target.pageId,
        toIndex: target.index
      };
    }

    if (target.zone === "center") {
      if (source.tileKind === "shortcut" && target.tileKind === "folder") {
        return {
          type: "ADD_TO_FOLDER",
          sourceTileId: source.tileId,
          folderId: target.tileId
        };
      }

      if (source.tileKind !== "shortcut" || target.tileKind !== "shortcut") {
        return {
          type: "REORDER",
          tileId: source.tileId,
          targetPageId: target.pageId,
          toIndex: target.index
        };
      }

      return {
        type: "COMBINE",
        sourceTileId: source.tileId,
        targetTileId: target.tileId,
        targetPageId: target.pageId
      };
    }

    return {
      type: "REORDER",
      tileId: source.tileId,
      targetPageId: target.pageId,
      toIndex: target.index
    };
  }

  if (target.kind === "folder-child" || target.kind === "folder-end") {
    if (source.tileKind !== "shortcut") {
      return { type: "CANCEL" };
    }

    return {
      type: "ADD_TO_FOLDER",
      sourceTileId: source.tileId,
      folderId: target.folderId,
      atIndex: target.index
    };
  }

  if (target.kind === "page-surface") {
    if (source.pageId === target.pageId) {
      return {
        type: "REORDER",
        tileId: source.tileId,
        targetPageId: target.pageId,
        toIndex: target.index
      };
    }

    return {
      type: "CROSS_PAGE",
      tileId: source.tileId,
      fromPageId: source.pageId,
      toPageId: target.pageId,
      toIndex: target.index
    };
  }

  return { type: "CANCEL" };
}

function createFolderChildDropAction(source: Extract<DragSource, { kind: "folder-child" }>, target: DropTarget): DropAction {
  if (target.kind === "folder-child" || target.kind === "folder-end") {
    return {
      type: "ADD_TO_FOLDER",
      sourceTileId: source.shortcutId,
      folderId: target.folderId,
      atIndex: target.index
    };
  }

  if (target.kind === "top-level-tile") {
    if (target.tileKind === "shortcut" && target.zone === "center") {
      return {
        type: "COMBINE",
        sourceTileId: source.shortcutId,
        targetTileId: target.tileId,
        targetPageId: target.pageId
      };
    }

    // Cross-folder: dragging shortcut from Folder A and dropping onto Folder B (center zone)
    if (target.tileKind === "folder" && target.zone === "center") {
      return {
        type: "ADD_TO_FOLDER",
        sourceTileId: source.shortcutId,
        folderId: target.tileId
      };
    }

    return {
      type: "PROMOTE",
      tileId: source.shortcutId,
      fromFolderId: source.folderId,
      toPageId: target.pageId,
      toIndex: target.index
    };
  }

  if (target.kind === "page-surface") {
    return {
      type: "PROMOTE",
      tileId: source.shortcutId,
      fromFolderId: source.folderId,
      toPageId: target.pageId,
      toIndex: target.index
    };
  }

  return { type: "CANCEL" };
}
