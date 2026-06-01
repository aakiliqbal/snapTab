import type { ShortcutGridWidgetSettings, WidgetState } from "../../../domain/canvas";
import { RangeRow } from "../WidgetContextMenuControls";

type ShortcutGridWidgetContextMenuProps = {
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K]
  ) => void;
  setEnabled: (enabled: boolean) => void;
  shortcutGridWidget: WidgetState<ShortcutGridWidgetSettings>;
};

export function ShortcutGridWidgetContextMenu({
  changeShortcutGridWidgetSetting,
  setEnabled,
  shortcutGridWidget
}: ShortcutGridWidgetContextMenuProps) {
  return (
    <>
      <header className="widget-context-header">
        <span>Widget</span>
        <strong>Shortcut Grid</strong>
      </header>
      <label className="context-toggle-row">
        <span>Enabled</span>
        <input checked={shortcutGridWidget.enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
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
  );
}
