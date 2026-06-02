import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { findBrandIconRecommendations, type BrandIcon } from "../../domain/brandIcons";
import { emptyShortcutDraft, type ShortcutDraft } from "../../domain/drafts";
import { applyRecommendedIcon, createShortcutFromDraft, upsertShortcut } from "../../domain/tabOperations";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { useTabStore } from "../../stores/useTabStore";
import { getThemePreset, isThemeId, type ThemeId } from "../../domain/themes";
import type { TabState } from "../../domain/tabState";
import { ShortcutForm } from "../shortcut-editor";

const storageKey = "snapTabState";
const legacyStorageKey = ["in", "fi", "TabState"].join("");

type ActiveTab = {
  title?: string;
  url?: string;
};

export function PopupApp() {
  const tabState = useTabStore(
    useShallow(
      (state): TabState => ({
        canvas: state.canvas,
        layout: state.layout,
        pages: state.pages,
        schemaVersion: state.schemaVersion,
        searchProvider: state.searchProvider,
        themeId: state.themeId,
        tiles: state.tiles,
        wallpaper: state.wallpaper
      })
    )
  );
  const replaceState = useTabStore((state) => state.replaceState);
  const popupThemeId = usePopupThemeId(tabState.themeId);
  const theme = getThemePreset(popupThemeId);
  const { draft, message, setDraft, setMessage } = useCurrentTabShortcutDraft();
  const iconRecommendations = useMemo(() => findBrandIconRecommendations(draft.title, draft.url), [draft.title, draft.url]);

  usePopupBodyClass();

  function chooseRecommendedIcon(icon: BrandIcon) {
    setDraft((currentDraft) => applyRecommendedIcon(currentDraft, icon));
  }

  async function uploadShortcutIcon(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const iconDataUrl = await readFileAsDataUrl(file);
    setDraft((currentDraft) => ({
      ...currentDraft,
      iconImageDataUrl: iconDataUrl,
      iconMediaId: currentDraft.iconMediaId
    }));
  }

  function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const shortcut = createShortcutFromDraft(draft);
    if (!shortcut) {
      setMessage("Add a title and URL before saving.");
      return;
    }

    replaceState(upsertShortcut(tabState, shortcut, draft));
    setMessage("Saved to SnapTab.");
    window.setTimeout(() => window.close(), 550);
  }

  return (
    <main className="popup-root" data-theme={theme.id} style={theme.tokens as CSSProperties}>
      <section className="quick-link-modal popup-panel" aria-labelledby="popup-title">
        <div className="modal-header">
          <div>
            <h1 id="popup-title">Add current site</h1>
            <p>{message}</p>
          </div>
        </div>
        <ShortcutForm
          draft={draft}
          iconRecommendations={iconRecommendations}
          onApplyRecommendedIcon={chooseRecommendedIcon}
          onCancel={() => window.close()}
          onChangeDraft={setDraft}
          onSave={saveShortcut}
          onUploadIcon={(file) => void uploadShortcutIcon(file)}
          saveLabel="Add"
        />
      </section>
    </main>
  );
}

function usePopupBodyClass() {
  useEffect(() => {
    document.body.classList.add("popup-body");
    return () => document.body.classList.remove("popup-body");
  }, []);
}

function usePopupThemeId(tabStateThemeId: ThemeId) {
  const [popupThemeId, setPopupThemeId] = useState<ThemeId>(tabStateThemeId);

  useEffect(() => {
    let isMounted = true;

    readStoredThemeId().then((themeId) => {
      if (isMounted && themeId) {
        setPopupThemeId(themeId);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPopupThemeId(tabStateThemeId);
  }, [tabStateThemeId]);

  return popupThemeId;
}

function useCurrentTabShortcutDraft() {
  const [draft, setDraft] = useState<ShortcutDraft>({ ...emptyShortcutDraft });
  const [message, setMessage] = useState("Loading current tab...");

  useEffect(() => {
    let isMounted = true;

    getActiveTab().then((tab) => {
      if (!isMounted) {
        return;
      }

      const url = tab?.url ?? "";
      const title = tab?.title?.trim() || getTitleFromUrl(url);
      setDraft({
        ...emptyShortcutDraft,
        title,
        url,
        iconLabel: title.slice(0, 2).toUpperCase()
      });
      setMessage(url ? "Review and save this site to SnapTab." : "Could not read the current tab URL.");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { draft, message, setDraft, setMessage };
}

function readStoredThemeId(): Promise<ThemeId | null> {
  const chromeLocal = typeof chrome !== "undefined" ? chrome.storage?.local : undefined;

  if (chromeLocal) {
    return new Promise((resolve) => {
      chromeLocal.get([storageKey, legacyStorageKey], (items) => {
        const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
        if (error) {
          resolve(null);
          return;
        }

        resolve(extractThemeId(items[storageKey] ?? items[legacyStorageKey]));
      });
    });
  }

  return Promise.resolve(extractThemeId(window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey)));
}

function extractThemeId(value: unknown): ThemeId | null {
  const parsed = typeof value === "string" ? parseStoredValue(value) : value;
  if (!isRecord(parsed)) {
    return null;
  }

  const state = isRecord(parsed.state) ? parsed.state : parsed;
  return isThemeId(state.themeId) ? state.themeId : null;
}

function parseStoredValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getActiveTab(): Promise<ActiveTab | null> {
  const tabs = typeof chrome !== "undefined" ? chrome.tabs : undefined;
  const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;
  if (!tabs?.query) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (runtime?.lastError) {
        resolve(null);
        return;
      }

      resolve(activeTabs[0] ?? null);
    });
  });
}

function getTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Current site";
  } catch {
    return "Current site";
  }
}
