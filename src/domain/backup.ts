import { normalizeTabState, searchProviders, type TabState } from "./tabState";

export function parseTabStateBackup(value: unknown): TabState {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)) {
    throw new Error("Unsupported backup schema");
  }

  if (value.schemaVersion === 1) {
    throw new Error("Legacy backup schema");
  }

  if (
    !isRecord(value.layout) ||
    !isRecord(value.wallpaper) ||
    typeof value.searchProvider !== "string" ||
    !(value.searchProvider in searchProviders)
  ) {
    throw new Error("Invalid backup shape");
  }

  if (!isRecord(value.tiles) || !Array.isArray(value.pages)) {
    throw new Error("Invalid backup shape");
  }

  return normalizeTabState(value as Partial<TabState>);
}

export function describeBackupReplacement(state: TabState): string {
  const shortcutCount = Object.values(state.tiles).filter((tile) => tile.kind === "shortcut").length;
  const folderCount = Object.values(state.tiles).filter((tile) => tile.kind === "folder").length;

  return `This will replace ${shortcutCount} shortcut${shortcutCount === 1 ? "" : "s"}, ${folderCount} folder${
    folderCount === 1 ? "" : "s"
  }, settings, and wallpaper.`;
}

export function getBackupImportErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "The selected file is not valid JSON.";
  }

  if (error instanceof Error) {
    if (error.message === "Unsupported backup schema") {
      return "This backup uses an unsupported schema version.";
    }

    if (error.message === "Legacy backup schema") {
      return "This backup uses the old v1 format. Export a new backup after opening the latest version of SnapTab.";
    }

    if (error.message === "Invalid backup shape") {
      return "This backup file is missing required fields.";
    }
  }

  return "Could not import this backup file.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
