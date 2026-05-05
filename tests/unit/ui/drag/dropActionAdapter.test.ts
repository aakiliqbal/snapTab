import { describe, expect, it } from "vitest";
import { createDropAction } from "../../../../src/ui/drag/dropActionAdapter";

describe("createDropAction", () => {
  it("combines top-level shortcuts only on center zone", () => {
    expect(
      createDropAction(
        { kind: "top-level", tileKind: "shortcut", tileId: "a", pageId: "page-1", index: 0 },
        { kind: "top-level-tile", tileKind: "shortcut", tileId: "b", pageId: "page-1", index: 1, zone: "center" }
      )
    ).toEqual({ type: "COMBINE", sourceTileId: "a", targetTileId: "b", targetPageId: "page-1" });
  });

  it("adds top-level shortcuts to folders without creating nested folders", () => {
    expect(
      createDropAction(
        { kind: "top-level", tileKind: "shortcut", tileId: "a", pageId: "page-1", index: 0 },
        { kind: "top-level-tile", tileKind: "folder", tileId: "folder-1", pageId: "page-1", index: 1, zone: "center" }
      )
    ).toEqual({ type: "ADD_TO_FOLDER", sourceTileId: "a", folderId: "folder-1" });

    expect(
      createDropAction(
        { kind: "top-level", tileKind: "folder", tileId: "folder-2", pageId: "page-1", index: 0 },
        { kind: "folder-end", folderId: "folder-1", index: 2 }
      )
    ).toEqual({ type: "CANCEL" });
  });

  it("reorders folder children inside folders instead of combining", () => {
    expect(
      createDropAction(
        { kind: "folder-child", shortcutId: "a", folderId: "folder-1", pageId: "page-1", index: 0 },
        { kind: "folder-child", folderId: "folder-1", shortcutId: "b", index: 1, zone: "trailing" }
      )
    ).toEqual({ type: "ADD_TO_FOLDER", sourceTileId: "a", folderId: "folder-1", atIndex: 1 });
  });

  it("promotes folder children to a chosen page insertion index", () => {
    expect(
      createDropAction(
        { kind: "folder-child", shortcutId: "a", folderId: "folder-1", pageId: "page-1", index: 0 },
        { kind: "top-level-tile", tileKind: "shortcut", tileId: "b", pageId: "page-2", index: 3, zone: "trailing" }
      )
    ).toEqual({ type: "PROMOTE", tileId: "a", fromFolderId: "folder-1", toPageId: "page-2", toIndex: 3 });
  });

  it("moves top-level tiles across pages", () => {
    expect(
      createDropAction(
        { kind: "top-level", tileKind: "shortcut", tileId: "a", pageId: "page-1", index: 0 },
        { kind: "top-level-tile", tileKind: "shortcut", tileId: "b", pageId: "page-2", index: 2, zone: "trailing" }
      )
    ).toEqual({ type: "CROSS_PAGE", tileId: "a", fromPageId: "page-1", toPageId: "page-2", toIndex: 2 });
  });
});
