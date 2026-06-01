import type { Shortcut, TabState, Tile } from "../domain/tabState";

type MediaRecord = {
  id: string;
  kind: "wallpaper" | "icon";
  dataUrl: string;
  createdAt: number;
};

const databaseName = "snaptab-media";
const legacyDatabaseName = ["in", "fi", "-tab-media"].join("");
const storeName = "media";
const memoryMediaRecords = new Map<string, MediaRecord>();

export async function storeMediaDataUrl(
  dataUrl: string,
  kind: MediaRecord["kind"],
  preferredId?: string | null
): Promise<string> {
  const id = preferredId ?? crypto.randomUUID();
  await putMediaRecord({
    id,
    kind,
    dataUrl,
    createdAt: Date.now()
  });
  return id;
}

export async function loadMediaDataUrl(id: string): Promise<string | null> {
  const record = await getMediaRecord(id);
  return record?.dataUrl ?? null;
}

export async function deleteMediaDataUrl(id: string): Promise<void> {
  await deleteMediaRecord(id);
}

export async function materializeTabStateMedia(state: TabState): Promise<TabState> {
  const wallpaper = await materializeWallpaper(state.wallpaper);
  const tiles = await materializeTiles(state.tiles);

  return {
    ...state,
    wallpaper,
    tiles
  };
}

export function stripResolvedMediaFromTabState(state: TabState): TabState {
  return {
    ...state,
    wallpaper: {
      ...state.wallpaper,
      value: null
    },
    tiles: stripTiles(state.tiles)
  };
}

async function materializeWallpaper(stateWallpaper: TabState["wallpaper"]): Promise<TabState["wallpaper"]> {
  if (stateWallpaper.type !== "dataUrl") {
    return stateWallpaper;
  }

  let mediaId = stateWallpaper.mediaId ?? null;
  let value = stateWallpaper.value ?? null;

  if (value) {
    mediaId = await storeMediaDataUrl(value, "wallpaper", mediaId);
  }

  if (!value && mediaId) {
    value = await loadMediaDataUrl(mediaId);
  }

  return {
    ...stateWallpaper,
    mediaId,
    value
  };
}

async function materializeShortcutIcon(shortcut: Shortcut): Promise<Shortcut> {
  if (shortcut.icon.type !== "image") {
    return shortcut;
  }

  let imageMediaId = shortcut.icon.imageMediaId ?? null;
  let imageDataUrl = shortcut.icon.imageDataUrl ?? null;

  if (imageDataUrl) {
    imageMediaId = await storeMediaDataUrl(imageDataUrl, "icon", imageMediaId);
  }

  if (!imageDataUrl && imageMediaId) {
    imageDataUrl = await loadMediaDataUrl(imageMediaId);
  }

  return {
    ...shortcut,
    icon: {
      ...shortcut.icon,
      imageMediaId,
      imageDataUrl
    }
  };
}

async function materializeTiles(tiles: TabState["tiles"]): Promise<TabState["tiles"]> {
  const entries = await Promise.all(
    Object.entries(tiles).map(async ([id, tile]) => [id, tile.kind === "shortcut" ? await materializeShortcutIcon(tile) : tile] as const)
  );

  return Object.fromEntries(entries);
}

function stripTiles(tiles: TabState["tiles"]): TabState["tiles"] {
  return Object.fromEntries(Object.entries(tiles).map(([id, tile]) => [id, stripTile(tile)]));
}

function stripTile(tile: Tile): Tile {
  if (tile.kind !== "shortcut") {
    return tile;
  }

  return {
    ...tile,
    icon: {
      ...tile.icon,
      imageDataUrl: null
    }
  };
}

async function putMediaRecord(record: MediaRecord) {
  if (!hasIndexedDb()) {
    memoryMediaRecords.set(record.id, record);
    return;
  }

  const database = await openDatabase(databaseName);
  await runRequest(
    database.transaction(storeName, "readwrite").objectStore(storeName).put(record),
    "Could not store media"
  );
}

async function getMediaRecord(id: string): Promise<MediaRecord | null> {
  if (!hasIndexedDb()) {
    return memoryMediaRecords.get(id) ?? null;
  }

  const database = await openDatabase(databaseName);
  const record = await runRequest(database.transaction(storeName, "readonly").objectStore(storeName).get(id), "Could not load media");
  if (record) {
    return record;
  }

  const legacyDatabase = await openDatabase(legacyDatabaseName);
  return (await runRequest(legacyDatabase.transaction(storeName, "readonly").objectStore(storeName).get(id), "Could not load media")) ?? null;
}

async function deleteMediaRecord(id: string) {
  if (!hasIndexedDb()) {
    memoryMediaRecords.delete(id);
    return;
  }

  const database = await openDatabase(databaseName);
  await runRequest(database.transaction(storeName, "readwrite").objectStore(storeName).delete(id), "Could not delete media");
  const legacyDatabase = await openDatabase(legacyDatabaseName);
  await runRequest(legacyDatabase.transaction(storeName, "readwrite").objectStore(storeName).delete(id), "Could not delete media");
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open media database")));
  });
}

function runRequest<T>(request: IDBRequest<T>, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error(errorMessage)));
  });
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}
