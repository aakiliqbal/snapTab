import type { CSSProperties } from "react";
import { searchProviders, type SearchProviderId, type TabState } from "../../domain/tabState";
import type { SearchWidgetSettings, ShortcutGridWidgetSettings, WidgetId } from "../../domain/canvas";

type ContextMenuState =
  | { type: "canvas"; x: number; y: number }
  | { type: "widget"; widgetId: WidgetId; x: number; y: number };

type WidgetContextMenuProps = {
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  close: () => void;
  menu: ContextMenuState;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
};

export type { ContextMenuState };

export function WidgetContextMenu({
  changeSearchWidgetSetting,
  changeShortcutGridWidgetSetting,
  close,
  menu,
  setWidgetEnabled,
  tabState
}: WidgetContextMenuProps) {
  const searchWidget = tabState.canvas.widgets.search;
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const style = {
    "--context-menu-x": `${menu.x}px`,
    "--context-menu-y": `${menu.y}px`
  } as CSSProperties;

  return (
    <div className="widget-context-backdrop" onMouseDown={close} role="presentation">
      <section
        className="widget-context-menu"
        onMouseDown={(event) => event.stopPropagation()}
        role="menu"
        style={style}
      >
        {menu.type === "canvas" ? (
          <>
            <header className="widget-context-header">
              <span>Canvas</span>
              <strong>Widgets</strong>
            </header>
            <label className="context-toggle-row">
              <span>Search Widget</span>
              <input
                checked={searchWidget.enabled}
                onChange={(event) => setWidgetEnabled("search", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="context-toggle-row">
              <span>Shortcut Grid Widget</span>
              <input
                checked={shortcutGridWidget.enabled}
                onChange={(event) => setWidgetEnabled("shortcutGrid", event.target.checked)}
                type="checkbox"
              />
            </label>
          </>
        ) : menu.widgetId === "search" ? (
          <>
            <header className="widget-context-header">
              <span>Widget</span>
              <strong>Search</strong>
            </header>
            <label className="context-toggle-row">
              <span>Enabled</span>
              <input
                checked={searchWidget.enabled}
                onChange={(event) => setWidgetEnabled("search", event.target.checked)}
                type="checkbox"
              />
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
        ) : (
          <>
            <header className="widget-context-header">
              <span>Widget</span>
              <strong>Shortcut Grid</strong>
            </header>
            <label className="context-toggle-row">
              <span>Enabled</span>
              <input
                checked={shortcutGridWidget.enabled}
                onChange={(event) => setWidgetEnabled("shortcutGrid", event.target.checked)}
                type="checkbox"
              />
            </label>
            <RangeRow
              label="Icon size"
              max={220}
              min={50}
              onChange={(value) => changeShortcutGridWidgetSetting("iconSize", value)}
              suffix="%"
              value={shortcutGridWidget.settings.iconSize}
            />
            <RangeRow
              label="Column spacing"
              max={100}
              min={0}
              onChange={(value) => changeShortcutGridWidgetSetting("columnSpacing", value)}
              suffix="%"
              value={shortcutGridWidget.settings.columnSpacing}
            />
            <RangeRow
              label="Line spacing"
              max={100}
              min={0}
              onChange={(value) => changeShortcutGridWidgetSetting("lineSpacing", value)}
              suffix="%"
              value={shortcutGridWidget.settings.lineSpacing}
            />
            <label className="context-toggle-row">
              <span>Labels</span>
              <input
                checked={shortcutGridWidget.settings.showLabels}
                onChange={(event) => changeShortcutGridWidgetSetting("showLabels", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="context-toggle-row">
              <span>Page dots</span>
              <input
                checked={shortcutGridWidget.settings.showPageDots}
                onChange={(event) => changeShortcutGridWidgetSetting("showPageDots", event.target.checked)}
                type="checkbox"
              />
            </label>
          </>
        )}
      </section>
    </div>
  );
}

type RangeRowProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
};

function RangeRow({ label, max, min, onChange, suffix, value }: RangeRowProps) {
  return (
    <label className="context-range-row">
      <span>{label}</span>
      <input min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} />
      <output>{value}{suffix}</output>
    </label>
  );
}
