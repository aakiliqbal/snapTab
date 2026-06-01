import { searchProviders, type SearchProviderId } from "../../../domain/tabState";
import type { SearchWidgetSettings } from "../../../domain/canvas";
import type { WidgetState } from "../../../domain/canvas";
import { RangeRow } from "../WidgetContextMenuControls";

type SearchWidgetContextMenuProps = {
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  searchWidget: WidgetState<SearchWidgetSettings>;
  setEnabled: (enabled: boolean) => void;
};

export function SearchWidgetContextMenu({
  changeSearchWidgetSetting,
  searchWidget,
  setEnabled
}: SearchWidgetContextMenuProps) {
  return (
    <>
      <header className="widget-context-header">
        <span>Widget</span>
        <strong>Search</strong>
      </header>
      <label className="context-toggle-row">
        <span>Enabled</span>
        <input checked={searchWidget.enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
      </label>
      <label>
        <span>Provider</span>
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
      <label className="context-toggle-row">
        <span>Provider tabs</span>
        <input
          checked={searchWidget.settings.showProviderTabs}
          onChange={(event) => changeSearchWidgetSetting("showProviderTabs", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Search mark</span>
        <input
          checked={searchWidget.settings.showSearchMark}
          onChange={(event) => changeSearchWidgetSetting("showSearchMark", event.target.checked)}
          type="checkbox"
        />
      </label>
      <RangeRow
        label="Opacity"
        max={100}
        min={0}
        onChange={(value) => changeSearchWidgetSetting("opacity", value)}
        suffix="%"
        value={searchWidget.settings.opacity}
      />
      <RangeRow
        label="Roundness"
        max={100}
        min={0}
        onChange={(value) => changeSearchWidgetSetting("radius", value)}
        suffix="%"
        value={searchWidget.settings.radius}
      />
    </>
  );
}
