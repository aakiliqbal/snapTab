import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import { materializeTabStateMedia, stripResolvedMediaFromTabState } from "../../../src/infrastructure/mediaStorage";

describe("mediaStorage", () => {
  it("stores and reloads wallpaper and shortcut GIFs through media ids", async () => {
    const dataUrl = "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    const shortcut = defaultTabState.tiles.docs;
    if (shortcut.kind !== "shortcut") {
      throw new Error("Expected docs to be a shortcut");
    }
    const state = {
      ...defaultTabState,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl" as const,
        value: dataUrl,
        mediaId: null
      },
      tiles: {
        ...defaultTabState.tiles,
        docs: {
          ...shortcut,
          icon: {
            ...shortcut.icon,
            type: "image" as const,
            imageDataUrl: dataUrl,
            imageMediaId: null
          }
        }
      }
    };

    const hydrated = await materializeTabStateMedia(state);

    expect(hydrated.wallpaper.mediaId).toBeTruthy();
    expect(hydrated.tiles.docs.kind).toBe("shortcut");
    expect(hydrated.tiles.docs.kind === "shortcut" ? hydrated.tiles.docs.icon.imageMediaId : null).toBeTruthy();

    const stripped = stripResolvedMediaFromTabState(hydrated);
    expect(stripped.wallpaper.value).toBeNull();
    expect(stripped.tiles.docs.kind === "shortcut" ? stripped.tiles.docs.icon.imageDataUrl : "not-shortcut").toBeNull();

    const rehydrated = await materializeTabStateMedia(stripped);

    expect(rehydrated.wallpaper.value).toBe(dataUrl);
    expect(rehydrated.tiles.docs.kind === "shortcut" ? rehydrated.tiles.docs.icon.imageDataUrl : null).toBe(dataUrl);
  });

  it("preserves backup media ids while restoring media payloads", async () => {
    const dataUrl = "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    const shortcut = defaultTabState.tiles.docs;
    if (shortcut.kind !== "shortcut") {
      throw new Error("Expected docs to be a shortcut");
    }
    const state = {
      ...defaultTabState,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl" as const,
        value: dataUrl,
        mediaId: "wallpaper-id"
      },
      tiles: {
        ...defaultTabState.tiles,
        docs: {
          ...shortcut,
          icon: {
            ...shortcut.icon,
            type: "image" as const,
            imageDataUrl: dataUrl,
            imageMediaId: "icon-id"
          }
        }
      }
    };

    const hydrated = await materializeTabStateMedia(state);

    expect(hydrated.wallpaper.mediaId).toBe("wallpaper-id");
    expect(hydrated.tiles.docs.kind === "shortcut" ? hydrated.tiles.docs.icon.imageMediaId : null).toBe("icon-id");

    const stripped = stripResolvedMediaFromTabState(hydrated);
    const rehydrated = await materializeTabStateMedia(stripped);

    expect(rehydrated.wallpaper.mediaId).toBe("wallpaper-id");
    expect(rehydrated.tiles.docs.kind === "shortcut" ? rehydrated.tiles.docs.icon.imageMediaId : null).toBe("icon-id");
    expect(rehydrated.wallpaper.value).toBe(dataUrl);
    expect(rehydrated.tiles.docs.kind === "shortcut" ? rehydrated.tiles.docs.icon.imageDataUrl : null).toBe(dataUrl);
  });
});
