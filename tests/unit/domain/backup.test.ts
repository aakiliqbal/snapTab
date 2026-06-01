import { describe, expect, it } from "vitest";
import {
  describeBackupReplacement,
  getBackupImportErrorMessage,
  parseTabStateBackup
} from "../../../src/domain/backup";
import { defaultTabState } from "../../../src/domain/tabState";

describe("parseTabStateBackup", () => {
  it("normalizes v2 backups missing optional media settings", () => {
    const backup = {
      ...defaultTabState,
      wallpaper: {
        type: "dataUrl",
        value: "data:image/png;base64,abc"
      }
    };

    const parsed = parseTabStateBackup(backup);

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.wallpaper.dim).toBe(40);
    expect(parsed.wallpaper.blur).toBe(0);
    expect(parsed.pages[0].tileIds).toContain("docs");
  });

  it("rejects v1 backups with a legacy schema error", () => {
    const backup = {
      schemaVersion: 1,
      searchProvider: defaultTabState.searchProvider,
      layout: defaultTabState.layout,
      wallpaper: defaultTabState.wallpaper,
      quickLinks: [
        {
          kind: "shortcut",
          id: "docs",
          title: "Docs",
          url: "https://docs.google.com",
          icon: {
            type: "fallback",
            label: "D",
            background: "#4285f4"
          }
        }
      ],
      folders: [
        {
          id: "work-folder",
          title: "Work",
          icon: {
            type: "fallback",
            label: "W",
            background: "#64748b"
          },
          quickLinks: [
            {
              id: "work-notion",
              title: "Notion",
              url: "https://notion.so",
              icon: {
                type: "fallback",
                label: "N",
                background: "#111827"
              }
            }
          ]
        }
      ]
    };

    expect(() => parseTabStateBackup(backup)).toThrow("Legacy backup schema");
  });

  it("keeps media payload references in portable backup state", () => {
    const shortcut = defaultTabState.tiles.docs;
    if (shortcut.kind !== "shortcut") {
      throw new Error("Expected docs to be a shortcut");
    }

    const backup = {
      ...defaultTabState,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl" as const,
        value: "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        mediaId: "wallpaper-id"
      },
      tiles: {
        ...defaultTabState.tiles,
        docs: {
          ...shortcut,
          icon: {
            ...shortcut.icon,
            type: "image" as const,
            imageDataUrl: "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
            imageMediaId: "icon-id"
          }
        }
      }
    };

    const parsed = parseTabStateBackup(backup);

    expect(parsed.wallpaper.mediaId).toBe("wallpaper-id");
    expect(parsed.tiles.docs.kind === "shortcut" ? parsed.tiles.docs.icon.imageMediaId : null).toBe("icon-id");
  });

  it("rejects invalid shapes", () => {
    expect(() => parseTabStateBackup(null)).toThrow("Unsupported backup schema");
    expect(() => parseTabStateBackup({ schemaVersion: 2 })).toThrow("Invalid backup shape");
  });

  it("describes what the import will replace", () => {
    expect(describeBackupReplacement(defaultTabState)).toContain("shortcuts");
    expect(describeBackupReplacement(defaultTabState)).toContain("folder");
  });

  it("maps backup import errors to user-friendly messages", () => {
    expect(getBackupImportErrorMessage(new SyntaxError("Unexpected token"))).toBe(
      "The selected file is not valid JSON."
    );
    expect(getBackupImportErrorMessage(new Error("Unsupported backup schema"))).toBe(
      "This backup uses an unsupported schema version."
    );
    expect(getBackupImportErrorMessage(new Error("Legacy backup schema"))).toBe(
      "This backup uses the old v1 format. Export a new backup after opening the latest version of SnapTab."
    );
    expect(getBackupImportErrorMessage(new Error("Invalid backup shape"))).toBe(
      "This backup file is missing required fields."
    );
  });
});
