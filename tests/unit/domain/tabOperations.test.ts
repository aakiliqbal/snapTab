import { describe, expect, it } from "vitest";
import { createShortcutFromDraft, deleteFolderFromState, deleteShortcutFromState } from "../../../src/domain/tabOperations";
import type { TabState } from "../../../src/domain/tabState";
import type { ShortcutDraft } from "../../../src/domain/drafts";

describe("tabOperations", () => {
  it("promotes the remaining child when deleting a shortcut from a two-child folder", () => {
    const next = deleteShortcutFromState(createState(), draft("c"));

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.tiles.c).toBeUndefined();
    expect(next.tiles.d?.kind).toBe("shortcut");
    expect(next.pages[0].tileIds).toEqual(["a", "d", "folder-2"]);
  });

  it("deletes folder children when deleting a folder", () => {
    const next = deleteFolderFromState(createState(), "folder-1");

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.tiles.c).toBeUndefined();
    expect(next.tiles.d).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "folder-2"]);
  });

  it("preserves manual fallback icon edits for an existing shortcut", () => {
    const next = createShortcutFromDraft({
      ...draft("docs"),
      title: "Docs",
      url: "https://docs.google.com",
      iconLabel: "DX",
      iconBackground: "#123456"
    });

    expect(next?.icon).toEqual({
      type: "fallback",
      label: "DX",
      background: "#123456",
      imageDataUrl: null,
      imageMediaId: null,
      brandIconId: null
    });
  });

  it("auto-matches a brand icon for new shortcuts", () => {
    const next = createShortcutFromDraft({
      ...draft("docs"),
      id: null,
      title: "Docs",
      url: "https://docs.google.com"
    });

    expect(next?.icon.type).toBe("brand");
    expect(next?.icon.brandIconId).not.toBeNull();
  });
});

function draft(id: string): ShortcutDraft {
  return {
    id,
    folderId: null,
    title: id,
    url: `https://${id}.example.com`,
    iconLabel: id.toUpperCase(),
    iconBackground: "#111827",
    iconImageDataUrl: null,
    iconMediaId: null,
    brandIconId: null
  };
}

function createState(): TabState {
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
    wallpaper: { type: "none", value: null, mediaId: null, dim: 40, blur: 0 },
    tiles: {
      a: shortcut("a"),
      c: shortcut("c"),
      d: shortcut("d"),
      e: shortcut("e"),
      f: shortcut("f"),
      "folder-1": folder("folder-1", ["c", "d"]),
      "folder-2": folder("folder-2", ["e", "f"])
    },
    pages: [{ id: "page-1", tileIds: ["a", "folder-1", "folder-2"] }]
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
