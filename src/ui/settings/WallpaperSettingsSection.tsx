import type { TabState } from "../../domain/tabState";

type WallpaperSettingsSectionProps = {
  changeWallpaperSetting: (key: "dim" | "blur", value: number) => void;
  resetWallpaper: () => void;
  wallpaper: TabState["wallpaper"];
  uploadWallpaper: (file: File | null) => void;
  wallpaperMessage: string | null;
};

export function WallpaperSettingsSection({
  changeWallpaperSetting,
  resetWallpaper,
  wallpaper,
  uploadWallpaper,
  wallpaperMessage
}: WallpaperSettingsSectionProps) {
  return (
    <section className="settings-group">
      <h2>Wallpaper</h2>
      <div className="wallpaper-preview">
        <div className="wallpaper-preview-image" aria-hidden="true">
          {wallpaper.type === "dataUrl" && wallpaper.value ? (
            <img src={wallpaper.value} alt="" />
          ) : null}
        </div>
      </div>
      <label>
        <span>Dim the wallpaper</span>
        <input
          type="range"
          min="0"
          max="80"
          step="5"
          value={wallpaper.dim}
          onChange={(event) => changeWallpaperSetting("dim", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Blur</span>
        <input
          type="range"
          min="0"
          max="24"
          step="1"
          value={wallpaper.blur}
          onChange={(event) => changeWallpaperSetting("blur", Number(event.target.value))}
        />
      </label>
      <div className="settings-action-row">
        <label className="upload-button" aria-label="Upload wallpaper">
          Upload
          <input
            accept="image/*"
            type="file"
            onChange={(event) => {
              uploadWallpaper(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button className="launcher-action" type="button" onClick={resetWallpaper}>
          Reset
        </button>
      </div>
      {wallpaperMessage ? <p className="launcher-message">{wallpaperMessage}</p> : null}
    </section>
  );
}
