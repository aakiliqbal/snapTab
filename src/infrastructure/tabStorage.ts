import { defaultTabState, migrateLegacyTabState, normalizeTabState, type LegacyTabState, type TabState } from "../domain/tabState";
import { materializeTabStateMedia, stripResolvedMediaFromTabState } from "./mediaStorage";

const storageKey = "snapTabState";
const legacyStorageKey = ["in", "fi", "TabState"].join("");

export async function loadTabState(): Promise<TabState> {
  const stored = await storageGet<Partial<TabState> | Partial<LegacyTabState>>(storageKey, legacyStorageKey);

  if (!stored) {
    return saveTabState(defaultTabState);
  }

  const nextState =
    stored.schemaVersion === defaultTabState.schemaVersion
      ? normalizeTabState(stored as Partial<TabState>)
      : migrateLegacyTabState(stored as Partial<LegacyTabState>);

  const hydratedState = await materializeTabStateMedia(nextState);
  await storageSet(storageKey, stripResolvedMediaFromTabState(hydratedState));
  return hydratedState;
}

export async function saveTabState(state: TabState): Promise<TabState> {
  const materializedState = await materializeTabStateMedia(state);
  await storageSet(storageKey, stripResolvedMediaFromTabState(materializedState));
  return materializedState;
}

async function storageGet<T>(key: string, fallbackKey?: string): Promise<T | null> {
  const chromeLocal = getChromeLocalStorage();

  if (chromeLocal) {
    return new Promise((resolve) => {
      chromeLocal.get(fallbackKey ? [key, fallbackKey] : [key], (items) => {
        const value = (items[key] as T | undefined) ?? (fallbackKey ? (items[fallbackKey] as T | undefined) : undefined);
        resolve(value ?? null);
      });
    });
  }

  const raw = window.localStorage.getItem(key) ?? (fallbackKey ? window.localStorage.getItem(fallbackKey) : null);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function storageSet<T>(key: string, value: T): Promise<void> {
  const chromeLocal = getChromeLocalStorage();

  if (chromeLocal) {
    return new Promise((resolve, reject) => {
      chromeLocal.set({ [key]: value }, () => {
        const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
        if (error) {
          reject(new Error(error.message ?? "Chrome storage write failed"));
          return;
        }

        resolve();
      });
    });
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getChromeLocalStorage() {
  return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
}
