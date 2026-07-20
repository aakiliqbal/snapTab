import type { StateStorage } from "zustand/middleware";

type ExtensionStateStorageOptions = {
  legacyStorageKey: string;
  getSchemaVersion: (value: Record<string, unknown>) => number;
};

export function createExtensionStateStorage({ legacyStorageKey, getSchemaVersion }: ExtensionStateStorageOptions): StateStorage {
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

export function getChromeLocalStorage() {
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

function isZustandStorageValue(value: unknown): value is { state: unknown; version: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "state" in value &&
    "version" in value &&
    typeof value.version === "number"
  );
}
