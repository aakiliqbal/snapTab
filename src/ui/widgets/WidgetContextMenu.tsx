import type { CSSProperties } from "react";
import type { TabState } from "../../domain/tabState";
import type { DateTimeWidgetSettings, RssWidgetSettings, SearchWidgetSettings, ShortcutGridWidgetSettings, WeatherWidgetSettings, WidgetId } from "../../domain/canvas";
import { DateTimeWidgetContextMenu } from "./date-time";
import { RssWidgetContextMenu } from "./rss";
import { SearchWidgetContextMenu } from "./search";
import { ShortcutGridWidgetContextMenu } from "./shortcut-grid";
import { WeatherWidgetContextMenu } from "./weather";

type ContextMenuState =
  | { type: "canvas"; x: number; y: number }
  | { type: "widget"; widgetId: WidgetId; x: number; y: number };

type WidgetContextMenuProps = {
  changeDateTimeWidgetSetting: <K extends keyof DateTimeWidgetSettings>(key: K, value: DateTimeWidgetSettings[K]) => void;
  changeRssWidgetSetting: <K extends keyof RssWidgetSettings>(key: K, value: RssWidgetSettings[K]) => void;
  changeRssWidgetSettings: (settings: Partial<RssWidgetSettings>) => void;
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  changeWeatherWidgetSetting: <K extends keyof WeatherWidgetSettings>(key: K, value: WeatherWidgetSettings[K]) => void;
  changeWeatherWidgetSettings: (settings: Partial<WeatherWidgetSettings>) => void;
  close: () => void;
  menu: ContextMenuState;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
};

export type { ContextMenuState };

export function WidgetContextMenu({
  changeDateTimeWidgetSetting,
  changeRssWidgetSetting,
  changeRssWidgetSettings,
  changeSearchWidgetSetting,
  changeShortcutGridWidgetSetting,
  changeWeatherWidgetSetting,
  changeWeatherWidgetSettings,
  close,
  menu,
  setWidgetEnabled,
  tabState
}: WidgetContextMenuProps) {
  // This shell owns menu positioning and Canvas-level toggles; each Widget owns its settings section.
  const searchWidget = tabState.canvas.widgets.search;
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const weatherWidget = tabState.canvas.widgets.weather;
  const dateTimeWidget = tabState.canvas.widgets.dateTime;
  const rssWidget = tabState.canvas.widgets.rss;
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
            <label className="context-toggle-row">
              <span>Date & Time Widget</span>
              <input
                checked={dateTimeWidget.enabled}
                onChange={(event) => setWidgetEnabled("dateTime", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="context-toggle-row">
              <span>Weather Widget</span>
              <input
                checked={weatherWidget.enabled}
                onChange={(event) => setWidgetEnabled("weather", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="context-toggle-row">
              <span>Snap Feed Widget</span>
              <input
                checked={rssWidget.enabled}
                onChange={(event) => setWidgetEnabled("rss", event.target.checked)}
                type="checkbox"
              />
            </label>
          </>
        ) : menu.widgetId === "search" ? (
          <SearchWidgetContextMenu
            changeSearchWidgetSetting={changeSearchWidgetSetting}
            searchWidget={searchWidget}
            setEnabled={(enabled) => setWidgetEnabled("search", enabled)}
          />
        ) : menu.widgetId === "shortcutGrid" ? (
          <ShortcutGridWidgetContextMenu
            changeShortcutGridWidgetSetting={changeShortcutGridWidgetSetting}
            setEnabled={(enabled) => setWidgetEnabled("shortcutGrid", enabled)}
            shortcutGridWidget={shortcutGridWidget}
          />
        ) : menu.widgetId === "dateTime" ? (
          <DateTimeWidgetContextMenu
            changeDateTimeWidgetSetting={changeDateTimeWidgetSetting}
            dateTimeWidget={dateTimeWidget}
            setEnabled={(enabled) => setWidgetEnabled("dateTime", enabled)}
          />
        ) : menu.widgetId === "weather" ? (
          <WeatherWidgetContextMenu
            changeWeatherWidgetSetting={changeWeatherWidgetSetting}
            changeWeatherWidgetSettings={changeWeatherWidgetSettings}
            setEnabled={(enabled) => setWidgetEnabled("weather", enabled)}
            weatherWidget={weatherWidget}
          />
        ) : (
          <RssWidgetContextMenu
            changeRssWidgetSetting={changeRssWidgetSetting}
            changeRssWidgetSettings={changeRssWidgetSettings}
            rssWidget={rssWidget}
            setEnabled={(enabled) => setWidgetEnabled("rss", enabled)}
          />
        )}
      </section>
    </div>
  );
}
