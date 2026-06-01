import type { CSSProperties } from "react";
import type { TabState } from "../../domain/tabState";
import type { SearchWidgetSettings, ShortcutGridWidgetSettings, WidgetId } from "../../domain/canvas";
import { SearchWidgetContextMenu } from "./search";
import { ShortcutGridWidgetContextMenu } from "./shortcut-grid";

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
  // This shell owns menu positioning and Canvas-level toggles; each Widget owns its settings section.
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
          <SearchWidgetContextMenu
            changeSearchWidgetSetting={changeSearchWidgetSetting}
            searchWidget={searchWidget}
            setEnabled={(enabled) => setWidgetEnabled("search", enabled)}
          />
        ) : (
          <ShortcutGridWidgetContextMenu
            changeShortcutGridWidgetSetting={changeShortcutGridWidgetSetting}
            setEnabled={(enabled) => setWidgetEnabled("shortcutGrid", enabled)}
            shortcutGridWidget={shortcutGridWidget}
          />
        )}
      </section>
    </div>
  );
}
