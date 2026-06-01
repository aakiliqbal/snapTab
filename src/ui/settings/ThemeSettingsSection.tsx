import { themePresets, type ThemeId } from "../../domain/themes";

type ThemeSettingsSectionProps = {
  activeThemeId: ThemeId;
  changeTheme: (themeId: ThemeId) => void;
};

export function ThemeSettingsSection({ activeThemeId, changeTheme }: ThemeSettingsSectionProps) {
  return (
    <section className="settings-group theme-settings-group" aria-labelledby="theme-settings-title">
      <div className="settings-group-heading">
        <h2 id="theme-settings-title">Theme</h2>
        <p>Choose a global color system for the Canvas, Shortcut Grid, and edit dialogs.</p>
      </div>
      <div className="theme-grid" role="radiogroup" aria-label="Theme">
        {Object.values(themePresets).map((theme) => (
          <button
            aria-checked={theme.id === activeThemeId}
            className={`theme-card${theme.id === activeThemeId ? " active" : ""}`}
            key={theme.id}
            onClick={() => changeTheme(theme.id)}
            role="radio"
            type="button"
          >
            <span className="theme-swatch-row" aria-hidden="true">
              {theme.preview.map((color) => (
                <span className="theme-swatch" key={color} style={{ background: color }} />
              ))}
            </span>
            <strong>{theme.label}</strong>
            <span>{theme.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
