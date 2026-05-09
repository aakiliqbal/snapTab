/// <reference types="vite/client" />

type ChromeStorageArea = {
  get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
  remove?: (keys: string[], callback?: () => void) => void;
};

type ChromeTab = {
  title?: string;
  url?: string;
};

type ChromeTabs = {
  query: (queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: ChromeTab[]) => void) => void;
};

declare const chrome:
  | {
      runtime?: {
        lastError?: {
          message?: string;
        };
      };
      storage?: {
        local?: ChromeStorageArea;
      };
      tabs?: ChromeTabs;
    }
  | undefined;
