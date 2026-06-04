/// <reference types="vite/client" />

type ChromeStorageArea = {
  get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
  remove?: (keys: string[], callback?: () => void) => void;
};

type ChromeTab = {
  id?: number;
  title?: string;
  url?: string;
};

type ChromeTabs = {
  create: (createProperties: { url: string; active?: boolean }, callback?: (tab: ChromeTab) => void) => void;
  getCurrent?: (callback: (tab: ChromeTab) => void) => void;
  query: (queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: ChromeTab[]) => void) => void;
  remove?: (tabId: number, callback?: () => void) => void;
};

type ChromeStorageChangeEvent = {
  addListener: (callback: (changes: Record<string, unknown>, areaName: string) => void) => void;
  removeListener: (callback: (changes: Record<string, unknown>, areaName: string) => void) => void;
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
        onChanged?: ChromeStorageChangeEvent;
      };
      tabs?: ChromeTabs;
    }
  | undefined;
