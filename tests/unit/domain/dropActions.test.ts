import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { applyDropAction, resolveDrop, runFolderCleanup, type DropZone } from "../../../src/domain/dropActions";
import type { TabState } from "../../../src/domain/tabState";

describe("applyDropAction", () => {
  it("reorders a tile within a page", () => {
    const next = reduceTestState({ type: "REORDER", tileId: "a", targetPageId: "page-1", toIndex: 2 });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1", "a"]);
  });

  it("combines two shortcuts into a folder at the target position", () => {
    const next = reduceTestState({
      type: "COMBINE",
      sourceTileId: "a",
      targetTileId: "b",
      targetPageId: "page-1",
      folderId: "combined"
    });

    expect(next.pages[0].tileIds).toEqual(["combined", "folder-1"]);
    expect(next.tiles.combined.kind).toBe("folder");
    expect(next.tiles.combined.kind === "folder" ? next.tiles.combined.childIds : []).toEqual(["a", "b"]);
  });

  it("combines a folder child with a top-level shortcut and cleans up the source folder", () => {
    const next = reduceTestState({
      type: "COMBINE",
      sourceTileId: "c",
      targetTileId: "a",
      targetPageId: "page-1",
      folderId: "combined"
    });

    expect(next.pages[0].tileIds).toEqual(["combined", "b", "d"]);
    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.tiles.combined.kind === "folder" ? next.tiles.combined.childIds : []).toEqual(["c", "a"]);
  });

  it("ignores duplicate combine actions after source and target leave the page", () => {
    const next = produce(createTestState(), (draft) => {
      applyDropAction(draft, {
        type: "COMBINE",
        sourceTileId: "a",
        targetTileId: "b",
        targetPageId: "page-1",
        folderId: "combined-1"
      });
      applyDropAction(draft, {
        type: "COMBINE",
        sourceTileId: "a",
        targetTileId: "b",
        targetPageId: "page-1",
        folderId: "combined-2"
      });
    });

    expect(next.pages[0].tileIds).toEqual(["combined-1", "folder-1"]);
    expect(next.tiles["combined-1"].kind === "folder" ? next.tiles["combined-1"].childIds : []).toEqual(["a", "b"]);
    expect(next.tiles["combined-2"]).toBeUndefined();
  });

  it("adds a shortcut to a folder", () => {
    const next = reduceTestState({ type: "ADD_TO_FOLDER", sourceTileId: "a", folderId: "folder-1" });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1"]);
    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual([
      "c",
      "d",
      "a"
    ]);
  });

  it("rejects adding folders to folders", () => {
    const state = createTestState();
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "ADD_TO_FOLDER", sourceTileId: "folder-1", folderId: "folder-2" });
    });

    expect(next).toEqual(state);
  });

  it("rejects adding a folder to itself", () => {
    const state = createTestState();
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "ADD_TO_FOLDER", sourceTileId: "folder-1", folderId: "folder-1" });
    });

    expect(next).toEqual(state);
  });

  it("moves a tile between pages", () => {
    const next = reduceTestState({
      type: "CROSS_PAGE",
      tileId: "a",
      fromPageId: "page-1",
      toPageId: "page-2",
      toIndex: 1
    });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1"]);
    expect(next.pages[1].tileIds).toEqual(["e", "a", "folder-2"]);
  });

  it("compacts the source page when cross-page drag moves its only tile", () => {
    const state = createTestState();
    state.pages = [
      { id: "page-1", tileIds: ["a"] },
      { id: "page-2", tileIds: ["b", "folder-1"] }
    ];

    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "CROSS_PAGE", tileId: "a", fromPageId: "page-1", toPageId: "page-2", toIndex: 1 });
    });

    expect(next.pages).toEqual([{ id: "page-2", tileIds: ["b", "a", "folder-1"] }]);
  });

  it("shifts overflow when cross-page drag inserts into a full page", () => {
    const state = createTestState();
    state.layout.gridLayout = { ...state.layout.gridLayout, rows: 1, columns: 2 };

    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "CROSS_PAGE", tileId: "a", fromPageId: "page-1", toPageId: "page-2", toIndex: 1 });
    });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1"]);
    expect(next.pages[1].tileIds).toEqual(["e", "a"]);
    expect(next.pages[2].tileIds).toEqual(["folder-2"]);
  });

  it("moves a shortcut from one folder to another (cross-folder)", () => {
    // c is in folder-1 (childIds: ["c","d"]); move c to folder-2
    const next = reduceTestState({
      type: "ADD_TO_FOLDER",
      sourceTileId: "c",
      folderId: "folder-2"
    });

    // c must be in folder-2
    const folder2 = next.tiles["folder-2"];
    expect(folder2?.kind === "folder" ? folder2.childIds : []).toContain("c");
    // folder-1 had only "d" left → dissolved by runFolderCleanup
    expect(next.tiles["folder-1"]).toBeUndefined();
    // d is promoted back to page-1 (at folder-1's old position)
    expect(next.pages[0].tileIds).toContain("d");
    expect(next.pages[0].tileIds).not.toContain("folder-1");
  });

  it("promotes a folder child to a page and cleans up the source folder", () => {
    const next = reduceTestState({
      type: "PROMOTE",
      tileId: "c",
      fromFolderId: "folder-1",
      toPageId: "page-1",
      toIndex: 1
    });

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "c", "b", "d"]);
  });

  it("shifts the last tile to the next page when promoting into a full page", () => {
    const state = createTestState();
    state.layout.gridLayout = { ...state.layout.gridLayout, rows: 1, columns: 3 };

    const next = produce(state, (draft) => {
      applyDropAction(draft, {
        type: "PROMOTE",
        tileId: "c",
        fromFolderId: "folder-1",
        toPageId: "page-1",
        toIndex: 1
      });
    });

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "c", "b"]);
    expect(next.pages[1].tileIds).toEqual(["d", "e", "folder-2"]);
  });

  it("leaves state unchanged on cancel", () => {
    const state = createTestState();
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "CANCEL" });
    });

    expect(next).toEqual(state);
  });
});

describe("runFolderCleanup", () => {
  it("removes an empty folder", () => {
    const next = cleanupState([]);

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "b"]);
  });

  it("promotes the remaining child when a folder has one child", () => {
    const next = cleanupState(["c"]);

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "b", "c"]);
  });

  it("keeps folders with two children", () => {
    const next = cleanupState(["c", "d"]);

    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual(["c", "d"]);
    expect(next.pages[0].tileIds).toEqual(["a", "b", "folder-1"]);
  });

  it("keeps folders with three or more children", () => {
    const next = cleanupState(["c", "d", "e"]);

    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual([
      "c",
      "d",
      "e"
    ]);
  });
});

describe("applyDropAction multi-row reorder", () => {
  it("moves tile from row 1 to row 2 correctly - C over I (leading)", () => {
    // Simulates: grid with 12 slots (2 rows × 6 columns)
    // Initial: [A, B, C, D, E, F, G, H, I, J, K, L]
    // Drag: C (index 2) to index 8 (before I at index 8)
    // Result: [A, B, D, E, F, G, H, I, C, J, K, L]
    
    const state: TabState = {
      schemaVersion: 2,
      searchProvider: "google",
      layout: {
        iconSize: 86, gridGap: 34, columns: 6, showLabels: true,
        searchPosition: "top", hideSearchBox: false, hideSearchCategory: false,
        hideSearchButton: false, searchBoxSize: 100, searchBoxRadius: 100,
        searchBoxOpacity: 96,
        gridLayout: { mode: "preset", presetId: "2x7", rows: 2, columns: 7, columnSpacing: 100, lineSpacing: 100, iconSize: 100 }
      },
      wallpaper: { type: "none", value: null, mediaId: null, dim: 40, blur: 0 },
      tiles: {
        a: shortcut("A"), b: shortcut("B"), c: shortcut("C"),
        d: shortcut("D"), e: shortcut("E"), f: shortcut("F"),
        g: shortcut("G"), h: shortcut("H"), i: shortcut("I"),
        j: shortcut("J"), k: shortcut("K"), l: shortcut("L"),
      },
      pages: [{ id: "page-1", tileIds: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] }]
    };
    
    // Move "c" (from index 2) to index 8 (before I at index 8)
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "REORDER", tileId: "c", targetPageId: "page-1", toIndex: 8 });
    });
    
    // C should be at index 8, I should shift to index 9
    expect(next.pages[0].tileIds).toEqual(["a", "b", "d", "e", "f", "g", "h", "i", "c", "j", "k", "l"]);
  });
  
  it("moves tile from row 2 to row 1 - I over C (leading)", () => {
    const state: TabState = {
      schemaVersion: 2,
      searchProvider: "google",
      layout: {
        iconSize: 86, gridGap: 34, columns: 6, showLabels: true,
        searchPosition: "top", hideSearchBox: false, hideSearchCategory: false,
        hideSearchButton: false, searchBoxSize: 100, searchBoxRadius: 100,
        searchBoxOpacity: 96,
        gridLayout: { mode: "preset", presetId: "2x7", rows: 2, columns: 7, columnSpacing: 100, lineSpacing: 100, iconSize: 100 }
      },
      wallpaper: { type: "none", value: null, mediaId: null, dim: 40, blur: 0 },
      tiles: {
        a: shortcut("A"), b: shortcut("B"), c: shortcut("C"),
        d: shortcut("D"), e: shortcut("E"), f: shortcut("F"),
        g: shortcut("G"), h: shortcut("H"), i: shortcut("I"),
        j: shortcut("J"), k: shortcut("K"), l: shortcut("L"),
      },
      pages: [{ id: "page-1", tileIds: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] }]
    };
    
    // Move "i" (from index 8) to index 2 (before C at index 2)
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "REORDER", tileId: "i", targetPageId: "page-1", toIndex: 2 });
    });
    
    // I should be at index 2, C should shift to index 3
    expect(next.pages[0].tileIds).toEqual(["a", "b", "i", "c", "d", "e", "f", "g", "h", "j", "k", "l"]);
  });
});

describe("resolveDrop", () => {
  const zones: DropZone[] = ["leading", "center", "trailing"];

  it("cancels when there is no target", () => {
    expect(resolveDrop(createTestState(), baseResolveInput({ overId: null }))).toEqual({ type: "CANCEL" });
  });

  it("resolves folder-child drops on the surface to promote", () => {
    expect(
      resolveDrop(
        createTestState(),
        baseResolveInput({ activeId: "c", overId: "surface", sourceFolderId: "folder-1", toIndex: 1 })
      )
    ).toEqual({
      type: "PROMOTE",
      tileId: "c",
      fromFolderId: "folder-1",
      toPageId: "page-1",
      toIndex: 1
    });
  });

  it("resolves folder-child drops on the surface to the page end by default", () => {
    expect(
      resolveDrop(createTestState(), baseResolveInput({ activeId: "c", overId: "surface", sourceFolderId: "folder-1" }))
    ).toEqual({
      type: "PROMOTE",
      tileId: "c",
      fromFolderId: "folder-1",
      toPageId: "page-1",
      toIndex: 3
    });
  });

  it("resolves preview-page drops to cross-page moves", () => {
    expect(resolveDrop(createTestState(), baseResolveInput({ previewPageId: "page-2", toIndex: 1 }))).toEqual({
      type: "CROSS_PAGE",
      tileId: "a",
      fromPageId: "page-1",
      toPageId: "page-2",
      toIndex: 1
    });
  });

  it.each(zones)("resolves Shortcut over Shortcut in %s zone", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "a", overId: "b", overZone: zone }));

    expect(action.type).toBe(zone === "center" ? "COMBINE" : "REORDER");
  });

  it.each(zones)("resolves Shortcut over Folder in %s zone", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "a", overId: "folder-1", overZone: zone }));

    expect(action.type).toBe(zone === "center" ? "ADD_TO_FOLDER" : "REORDER");
  });

  it.each(zones)("resolves Folder over Shortcut in %s zone as reorder", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "folder-1", overId: "a", overZone: zone }));

    expect(action.type).toBe("REORDER");
  });

  it.each(zones)("resolves Folder over Folder in %s zone as reorder", (zone) => {
    const action = resolveDrop(
      createTestState(),
      baseResolveInput({ activeId: "folder-1", overId: "folder-2", overZone: zone })
    );

    expect(action.type).toBe("REORDER");
  });

  it("preserves an explicit reorder insertion index from UI geometry", () => {
    expect(resolveDrop(createTestState(), baseResolveInput({ overId: "folder-1", overZone: "trailing", toIndex: 0 }))).toEqual({
      type: "REORDER",
      tileId: "a",
      targetPageId: "page-1",
      toIndex: 0
    });
  });
});

function reduceTestState(action: Parameters<typeof applyDropAction>[1]) {
  return produce(createTestState(), (draft) => {
    applyDropAction(draft, action);
  });
}

function cleanupState(childIds: string[]) {
  return produce(createTestState(), (draft) => {
    if (draft.tiles["folder-1"].kind === "folder") {
      draft.tiles["folder-1"].childIds = childIds;
    }
    runFolderCleanup(draft, "folder-1");
  });
}

function baseResolveInput(overrides: Partial<Parameters<typeof resolveDrop>[1]> = {}): Parameters<typeof resolveDrop>[1] {
  return {
    activeId: "a",
    overId: "b",
    overZone: "leading",
    sourcePageId: "page-1",
    ...overrides
  };
}

function createTestState(): TabState {
  return {
    schemaVersion: 2,
    searchProvider: "google",
    layout: {
      iconSize: 86,
      gridGap: 34,
      columns: 6,
      showLabels: true,
      searchPosition: "top",
      hideSearchBox: false,
      hideSearchCategory: false,
      hideSearchButton: false,
      searchBoxSize: 100,
      searchBoxRadius: 100,
      searchBoxOpacity: 96,
      gridLayout: {
        mode: "preset",
        presetId: "2x6",
        rows: 2,
        columns: 6,
        columnSpacing: 100,
        lineSpacing: 100,
        iconSize: 100
      }
    },
    wallpaper: {
      type: "none",
      value: null,
      mediaId: null,
      dim: 40,
      blur: 0
    },
    tiles: {
      a: shortcut("a"),
      b: shortcut("b"),
      c: shortcut("c"),
      d: shortcut("d"),
      e: shortcut("e"),
      "folder-1": folder("folder-1", ["c", "d"]),
      "folder-2": folder("folder-2", ["a", "b"])
    },
    pages: [
      { id: "page-1", tileIds: ["a", "b", "folder-1"] },
      { id: "page-2", tileIds: ["e", "folder-2"] }
    ]
  };
}

function shortcut(id: string): TabState["tiles"][string] {
  return {
    kind: "shortcut",
    id,
    title: id.toUpperCase(),
    url: `https://${id}.example.com`,
    icon: {
      type: "fallback",
      label: id.toUpperCase(),
      background: "#111827"
    }
  };
}

function folder(id: string, childIds: string[]): TabState["tiles"][string] {
  return {
    kind: "folder",
    id,
    title: id,
    icon: {
      type: "fallback",
      label: "F",
      background: "#64748b"
    },
    childIds
  };
}
