import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { findBrandIconRecommendations, type BrandIcon } from "../../domain/brandIcons";
import { emptyShortcutDraft, type ShortcutDraft } from "../../domain/drafts";
import { applyRecommendedIcon, createShortcutFromDraft, upsertShortcut } from "../../domain/tabOperations";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { useTabStore } from "../../stores/useTabStore";
import { getThemePreset } from "../../domain/themes";
import { ShortcutForm } from "../shortcut-editor";

type ActiveTab = {
  title?: string;
  url?: string;
};

export function PopupApp() {
  const tabState = useTabStore();
  const replaceState = useTabStore((state) => state.replaceState);
  const theme = getThemePreset(tabState.themeId);
  const [draft, setDraft] = useState<ShortcutDraft>({ ...emptyShortcutDraft });
  const [message, setMessage] = useState("Loading current tab...");
  const iconRecommendations = useMemo(() => findBrandIconRecommendations(draft.title, draft.url), [draft.title, draft.url]);

  useEffect(() => {
    document.body.classList.add("popup-body");
    return () => document.body.classList.remove("popup-body");
  }, []);

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

  function chooseRecommendedIcon(icon: BrandIcon) {
    setDraft(applyRecommendedIcon(draft, icon));
  }

  async function uploadShortcutIcon(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const iconDataUrl = await readFileAsDataUrl(file);
    setDraft({
      ...draft,
      iconImageDataUrl: iconDataUrl,
      iconMediaId: draft.iconMediaId
    });
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

function getActiveTab(): Promise<ActiveTab | null> {
  const tabs = chrome?.tabs;
  if (!tabs?.query) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab ?? null));
  });
}

function getTitleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Current site";
  } catch {
    return "Current site";
  }
}
