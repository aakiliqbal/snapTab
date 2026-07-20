import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
import type { ThemeId } from "../domain/themes";
import { createExtensionStateStorage } from "../infrastructure/extensionStorage";

const storageKey = "snapTabState";
const legacyStorageKey = ["in", "fi", "TabState"].join("");

type TabStoreState = TabState & {
  hasHydrated: boolean;
  replaceState: (state: TabState) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  updateState: (update: (state: TabState) => TabState) => TabState;
  setLayout: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  setSearchProvider: (providerId: SearchProviderId) => void;
  setTheme: (themeId: ThemeId) => void;
  setWallpaper: (wallpaper: TabState["wallpaper"]) => void;
};

export const useTabStore = create<TabStoreState>()(
  persist(
    immer((set) => ({
      ...defaultTabState,
      hasHydrated: false,
      replaceState: (state) =>
        set((draft) => {
          Object.assign(draft, normalizeTabState(state));
        }),
      setHasHydrated: (hasHydrated) =>
        set((draft) => {
          draft.hasHydrated = hasHydrated;
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
      setTheme: (themeId) =>
        set((draft) => {
          draft.themeId = themeId;
        }),
      setWallpaper: (wallpaper) =>
        set((draft) => {
          draft.wallpaper = wallpaper;
        })
    })),
    {
      name: storageKey,
      storage: createJSONStorage(() => createExtensionStateStorage({ legacyStorageKey, getSchemaVersion })),
      version: 2,
      partialize: (state) => stripActions(state),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeTabState(toRecord(persistedState))
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      migrate: (persistedState, version) =>
        version === 1
          ? migrateLegacyTabState(persistedState as Partial<LegacyTabState>)
          : normalizeTabState(persistedState as Partial<TabState>)
    }
  )
);

export function subscribeToExternalTabStateChanges() {
  const chromeStorage = typeof chrome !== "undefined" ? chrome.storage : undefined;
  const handleChromeStorageChange = (changes: Record<string, unknown>, areaName: string) => {
    if (areaName === "local" && changes[storageKey]) {
      void useTabStore.persist.rehydrate();
    }
  };
  const handleLocalStorageChange = (event: StorageEvent) => {
    if (event.key === storageKey) {
      void useTabStore.persist.rehydrate();
    }
  };

  chromeStorage?.onChanged?.addListener(handleChromeStorageChange);
  window.addEventListener("storage", handleLocalStorageChange);

  return () => {
    chromeStorage?.onChanged?.removeListener(handleChromeStorageChange);
    window.removeEventListener("storage", handleLocalStorageChange);
  };
}

function stripActions(state: TabStoreState): TabState {
  return {
    schemaVersion: state.schemaVersion,
    searchProvider: state.searchProvider,
    layout: state.layout,
    themeId: state.themeId,
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
