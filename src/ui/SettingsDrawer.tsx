import { type SearchProviderId, type TabState } from "../domain/tabState";
import type { SearchWidgetSettings, ShortcutGridWidgetSettings, WidgetId } from "../domain/canvas";
import { BackupSettingsSection } from "./settings/BackupSettingsSection";
import { WallpaperSettingsSection } from "./settings/WallpaperSettingsSection";
import { WidgetSettingsSection } from "./settings/WidgetSettingsSection";

type SettingsDrawerProps = {
  backupMessage: string | null;
  changeLayout: <K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) => void;
  changeSearchProvider: (providerId: SearchProviderId) => void;
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  changeWallpaperSetting: (key: "dim" | "blur", value: number) => void;
  close: () => void;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
  resetWallpaper: () => void;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
  uploadWallpaper: (file: File | null) => void;
  wallpaperMessage: string | null;
};

export function SettingsDrawer({
  backupMessage,
  changeSearchWidgetSetting,
  changeShortcutGridWidgetSetting,
  changeWallpaperSetting,
  close,
  exportBackup,
  importBackup,
  resetWallpaper,
  setWidgetEnabled,
  tabState,
  uploadWallpaper,
  wallpaperMessage
}: SettingsDrawerProps) {
  return (
    <div
      className="settings-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title">
        <header className="settings-drawer-header">
          <div>
            <span className="settings-drawer-kicker">Infi Tab</span>
            <h1 id="settings-drawer-title">Settings</h1>
          </div>
          <button className="drawer-close" type="button" onClick={close} aria-label="Close settings">
            x
          </button>
        </header>

        <div className="settings-drawer-body">
          <section className="settings-drawer-section">
            <h2>Global Settings</h2>
            <WallpaperSettingsSection
              changeWallpaperSetting={changeWallpaperSetting}
              resetWallpaper={resetWallpaper}
              tabState={tabState}
              uploadWallpaper={uploadWallpaper}
              wallpaperMessage={wallpaperMessage}
            />
            <BackupSettingsSection backupMessage={backupMessage} exportBackup={exportBackup} importBackup={importBackup} />
          </section>

          <section className="settings-drawer-section">
            <h2>Widget Settings</h2>
            <WidgetSettingsSection
              changeSearchWidgetSetting={changeSearchWidgetSetting}
              changeShortcutGridWidgetSetting={changeShortcutGridWidgetSetting}
              setWidgetEnabled={setWidgetEnabled}
              tabState={tabState}
            />
          </section>
        </div>
      </aside>
    </div>
  );
}
