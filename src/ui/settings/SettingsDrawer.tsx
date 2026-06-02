import { type TabState } from "../../domain/tabState";
import type { ThemeId } from "../../domain/themes";
import { BackupSettingsSection } from "./BackupSettingsSection";
import { ThemeSettingsSection } from "./ThemeSettingsSection";
import { WallpaperSettingsSection } from "./WallpaperSettingsSection";

type SettingsDrawerProps = {
  backupMessage: string | null;
  changeTheme: (themeId: ThemeId) => void;
  changeWallpaperSetting: (key: "dim" | "blur", value: number) => void;
  close: () => void;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
  resetWallpaper: () => void;
  activeThemeId: ThemeId;
  wallpaper: TabState["wallpaper"];
  uploadWallpaper: (file: File | null) => void;
  wallpaperMessage: string | null;
};

export function SettingsDrawer({
  backupMessage,
  changeTheme,
  changeWallpaperSetting,
  close,
  exportBackup,
  importBackup,
  resetWallpaper,
  activeThemeId,
  wallpaper,
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
            <span className="settings-drawer-kicker">SnapTab</span>
            <h1 id="settings-drawer-title">Settings</h1>
          </div>
          <button className="drawer-close" type="button" onClick={close} aria-label="Close settings">
            ×
          </button>
        </header>

        <div className="settings-drawer-body">
          <section className="settings-drawer-section">
            <WallpaperSettingsSection
              changeWallpaperSetting={changeWallpaperSetting}
              resetWallpaper={resetWallpaper}
              wallpaper={wallpaper}
              uploadWallpaper={uploadWallpaper}
              wallpaperMessage={wallpaperMessage}
            />
            <ThemeSettingsSection activeThemeId={activeThemeId} changeTheme={changeTheme} />
            <BackupSettingsSection backupMessage={backupMessage} exportBackup={exportBackup} importBackup={importBackup} />
          </section>
        </div>
      </aside>
    </div>
  );
}
