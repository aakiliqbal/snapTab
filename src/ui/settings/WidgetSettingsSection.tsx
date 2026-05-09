import { searchProviders, type SearchProviderId, type TabState } from "../../domain/tabState";
import type { SearchWidgetSettings, ShortcutGridWidgetSettings, WidgetId } from "../../domain/canvas";

type WidgetSettingsSectionProps = {
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
};

export function WidgetSettingsSection({
  changeSearchWidgetSetting,
  changeShortcutGridWidgetSetting,
  setWidgetEnabled,
  tabState
}: WidgetSettingsSectionProps) {
  const searchWidget = tabState.canvas.widgets.search;
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;

  return (
    <section className="settings-group widget-settings-group">
      <h2>Search Widget</h2>
      <label>
        <span>Show Search Widget</span>
        <input
          checked={searchWidget.enabled}
          onChange={(event) => setWidgetEnabled("search", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        <span>Search provider</span>
        <select
          value={searchWidget.settings.searchProvider}
          onChange={(event) => changeSearchWidgetSetting("searchProvider", event.target.value as SearchProviderId)}
        >
          {Object.entries(searchProviders).map(([id, provider]) => (
            <option key={id} value={id}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Show provider tabs</span>
        <input
          checked={searchWidget.settings.showProviderTabs}
          onChange={(event) => changeSearchWidgetSetting("showProviderTabs", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        <span>Show search mark</span>
        <input
          checked={searchWidget.settings.showSearchMark}
          onChange={(event) => changeSearchWidgetSetting("showSearchMark", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        <span>Search opacity</span>
        <input
          min="0"
          max="100"
          onChange={(event) => changeSearchWidgetSetting("opacity", Number(event.target.value))}
          type="range"
          value={searchWidget.settings.opacity}
        />
      </label>
      <label>
        <span>Search roundness</span>
        <input
          min="0"
          max="100"
          onChange={(event) => changeSearchWidgetSetting("radius", Number(event.target.value))}
          type="range"
          value={searchWidget.settings.radius}
        />
      </label>

      <h2>Shortcut Grid Widget</h2>
      <label>
        <span>Show Shortcut Grid Widget</span>
        <input
          checked={shortcutGridWidget.enabled}
          onChange={(event) => setWidgetEnabled("shortcutGrid", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        <span>Icon size</span>
        <input
          min="50"
          max="120"
          onChange={(event) => changeShortcutGridWidgetSetting("iconSize", Number(event.target.value))}
          type="range"
          value={shortcutGridWidget.settings.iconSize}
        />
      </label>
      <label>
        <span>Column spacing</span>
        <input
          min="0"
          max="100"
          onChange={(event) => changeShortcutGridWidgetSetting("columnSpacing", Number(event.target.value))}
          type="range"
          value={shortcutGridWidget.settings.columnSpacing}
        />
      </label>
      <label>
        <span>Line spacing</span>
        <input
          min="0"
          max="100"
          onChange={(event) => changeShortcutGridWidgetSetting("lineSpacing", Number(event.target.value))}
          type="range"
          value={shortcutGridWidget.settings.lineSpacing}
        />
      </label>
      <label>
        <span>Show labels</span>
        <input
          checked={shortcutGridWidget.settings.showLabels}
          onChange={(event) => changeShortcutGridWidgetSetting("showLabels", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label>
        <span>Show page dots</span>
        <input
          checked={shortcutGridWidget.settings.showPageDots}
          onChange={(event) => changeShortcutGridWidgetSetting("showPageDots", event.target.checked)}
          type="checkbox"
        />
      </label>
    </section>
  );
}
