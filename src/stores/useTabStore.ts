import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  compactShortcutPages,
  defaultTabState,
  migrateLegacyTabState,
  normalizeTabState,
  type LegacyTabState,
  type LayoutSettings,
  type SearchProviderId,
  type ShortcutPage,
  type TabState
} from "../domain/tabState";

const storageKey = "snapTabState";
const legacyStorageKey = ["in", "fi", "TabState"].join("");

type TabStoreState = TabState & {
  replaceState: (state: TabState) => void;
  updateState: (update: (state: TabState) => TabState) => TabState;
  setLayout: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  setSearchProvider: (providerId: SearchProviderId) => void;
  setWallpaper: (wallpaper: TabState["wallpaper"]) => void;
};

export const useTabStore = create<TabStoreState>()(
  persist(
    immer((set) => ({
      ...defaultTabState,
      replaceState: (state) =>
        set((draft) => {
          Object.assign(draft, normalizeTabState(state));
        }),
      updateState: (update) => {
        const nextState = update(stripActions(useTabStore.getState()));
        set((draft) => {
          Object.assign(draft, normalizeTabState(nextState));
        });
        return nextState;
      },
      setLayout: (key, value) =>
        set((draft) => {
          draft.layout[key] = value;
          if (key === "gridLayout" && isGridLayoutSettings(value)) {
            draft.pages = rebalancePages(draft.pages, value.rows * value.columns);
          }
        }),
      setSearchProvider: (providerId) =>
        set((draft) => {
          draft.searchProvider = providerId;
          draft.canvas.widgets.search.settings.searchProvider = providerId;
        }),
      setWallpaper: (wallpaper) =>
        set((draft) => {
          draft.wallpaper = wallpaper;
        })
    })),
    {
      name: storageKey,
      storage: createJSONStorage(() => createChromeStorage()),
      version: 2,
      partialize: (state) => stripActions(state),
      migrate: (persistedState, version) =>
        version === 1
          ? migrateLegacyTabState(persistedState as Partial<LegacyTabState>)
          : normalizeTabState(persistedState as Partial<TabState>)
    }
  )
);

function stripActions(state: TabStoreState): TabState {
  return {
    schemaVersion: state.schemaVersion,
    searchProvider: state.searchProvider,
    layout: state.layout,
    canvas: state.canvas,
    wallpaper: state.wallpaper,
    tiles: state.tiles,
    pages: state.pages
  };
}

function rebalancePages(pages: ShortcutPage[], capacity: number): ShortcutPage[] {
  if (capacity < 1) {
    return pages;
  }

  const nextPages = pages.map((page) => ({ ...page, tileIds: [...page.tileIds] }));
  for (let index = 0; index < nextPages.length; index += 1) {
    while (nextPages[index].tileIds.length > capacity) {
      const overflow = nextPages[index].tileIds.splice(capacity);
      const nextPage = nextPages[index + 1] ?? { id: `page-${index + 2}`, tileIds: [] };
      nextPage.tileIds.unshift(...overflow);
      nextPages[index + 1] = nextPage;
    }
  }

  return compactShortcutPages(nextPages);
}

function createChromeStorage(): StateStorage {
  return {
    getItem: async (key) => {
      const chromeLocal = getChromeLocalStorage();

      if (chromeLocal) {
        return new Promise((resolve) => {
          chromeLocal.get([key, legacyStorageKey], (items) => {
            const value = items[key] ?? items[legacyStorageKey];
            if (!value) {
              resolve(null);
              return;
            }

            const parsed = typeof value === "string" ? parseStorageValue(value) : toRecord(value);
            if (isZustandStorageValue(parsed)) {
              resolve(JSON.stringify(parsed));
              return;
            }

            resolve(JSON.stringify({ state: parsed, version: getSchemaVersion(parsed) }));
          });
        });
      }

      const value = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyStorageKey);
      if (!value) {
        return null;
      }

      const parsed = parseStorageValue(value);
      return JSON.stringify(isZustandStorageValue(parsed) ? parsed : { state: parsed, version: getSchemaVersion(parsed) });
    },
    setItem: async (key, value) => {
      const chromeLocal = getChromeLocalStorage();

      if (chromeLocal) {
        await new Promise<void>((resolve, reject) => {
          chromeLocal.set({ [key]: value }, () => {
            const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
            if (error) {
              reject(new Error(error.message ?? "Chrome storage write failed"));
              return;
            }

            resolve();
          });
        });
        return;
      }

      window.localStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      const chromeLocal = getChromeLocalStorage();

      const remove = chromeLocal?.remove;
      if (remove) {
        await new Promise<void>((resolve, reject) => {
          remove([key], () => {
            const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
            if (error) {
              reject(new Error(error.message ?? "Chrome storage remove failed"));
              return;
            }

            resolve();
          });
        });
        return;
      }

      window.localStorage.removeItem(key);
    }
  };
}

function getChromeLocalStorage() {
  return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
}

function parseStorageValue(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function getSchemaVersion(value: Record<string, unknown>) {
  return typeof value.schemaVersion === "number" ? value.schemaVersion : 1;
}

function isGridLayoutSettings(value: unknown): value is LayoutSettings["gridLayout"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "rows" in value &&
    "columns" in value &&
    typeof value.rows === "number" &&
    typeof value.columns === "number"
  );
}

function isZustandStorageValue(value: unknown): value is { state: unknown; version: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "state" in value &&
    "version" in value &&
    typeof value.version === "number"
  );
}
