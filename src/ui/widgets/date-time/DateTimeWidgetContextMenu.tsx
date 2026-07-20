import { useEffect, useState } from "react";
import type {
  DateTimeClockMode,
  DateTimeDateMode,
  DateTimeDateOrder,
  DateTimeFormat,
  DateTimeShortSeparator,
  DateTimeWidgetSettings,
  WidgetState
} from "../../../domain/canvas";
import { WidgetVisualControls } from "../WidgetContextMenuControls";

type DateTimeWidgetContextMenuProps = {
  changeDateTimeWidgetSetting: <K extends keyof DateTimeWidgetSettings>(key: K, value: DateTimeWidgetSettings[K]) => void;
  dateTimeWidget: WidgetState<DateTimeWidgetSettings>;
  setEnabled: (enabled: boolean) => void;
};

type ColorSettingKey = "hourColor" | "minuteColor" | "secondColor";

const clockColorSettings: Array<{ key: ColorSettingKey; label: string }> = [
  { key: "hourColor", label: "Hour" },
  { key: "minuteColor", label: "Minute" },
  { key: "secondColor", label: "Second" }
];

const clockColorPalette = [
  "#f8fafc", "#e2e8f0", "#94a3b8", "#475569", "#1e293b", "#020617",
  "#fee2e2", "#fecaca", "#f87171", "#ef4444", "#b91c1c", "#7f1d1d",
  "#ffedd5", "#fed7aa", "#fb923c", "#f97316", "#c2410c", "#7c2d12",
  "#fef3c7", "#fde68a", "#fbbf24", "#f59e0b", "#b45309", "#78350f",
  "#dcfce7", "#bbf7d0", "#4ade80", "#22c55e", "#15803d", "#14532d",
  "#ccfbf1", "#99f6e4", "#2dd4bf", "#14b8a6", "#0f766e", "#134e4a",
  "#e0f2fe", "#bae6fd", "#38bdf8", "#0ea5e9", "#0369a1", "#0c4a6e",
  "#dbeafe", "#bfdbfe", "#60a5fa", "#3b82f6", "#1d4ed8", "#1e3a8a",
  "#ede9fe", "#ddd6fe", "#a78bfa", "#8b5cf6", "#6d28d9", "#4c1d95",
  "#fce7f3", "#fbcfe8", "#f472b6", "#ec4899", "#be185d", "#831843"
];

export function DateTimeWidgetContextMenu({
  changeDateTimeWidgetSetting,
  dateTimeWidget,
  setEnabled
}: DateTimeWidgetContextMenuProps) {
  const settings = dateTimeWidget.settings;
  const [activeColorSetting, setActiveColorSetting] = useState<ColorSettingKey>("hourColor");
  const [hexDraft, setHexDraft] = useState(settings.hourColor);

  useEffect(() => {
    setHexDraft(settings[activeColorSetting]);
  }, [activeColorSetting, settings]);

  function changeActiveColor(value: string) {
    changeDateTimeWidgetSetting(activeColorSetting, value);
  }

  function changeHexDraft(value: string) {
    setHexDraft(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      changeActiveColor(value);
    }
  }

  return (
    <>
      <header className="widget-context-header">
        <span>Widget</span>
        <strong>Date & Time</strong>
      </header>
      <label className="context-toggle-row">
        <span>Enabled</span>
        <input checked={dateTimeWidget.enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
      </label>

      <label>
        <span>Clock mode</span>
        <select
          value={settings.clockMode}
          onChange={(event) => changeDateTimeWidgetSetting("clockMode", event.target.value as DateTimeClockMode)}
        >
          <option value="digital">Digital</option>
          <option value="percentageComplete">Percentage complete</option>
          <option value="verticalClock">Vertical clock</option>
        </select>
      </label>
      <label>
        <span>Time format</span>
        <select
          value={settings.timeFormat}
          onChange={(event) => changeDateTimeWidgetSetting("timeFormat", event.target.value as DateTimeFormat)}
        >
          <option value="twentyFourHour">24 hour</option>
          <option value="twelveHour">12 hour</option>
        </select>
      </label>
      <label className="context-toggle-row">
        <span>Seconds</span>
        <input
          checked={settings.showSeconds}
          onChange={(event) => changeDateTimeWidgetSetting("showSeconds", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Leading zero</span>
        <input
          checked={settings.padHour}
          onChange={(event) => changeDateTimeWidgetSetting("padHour", event.target.checked)}
          type="checkbox"
        />
      </label>

      <div className="date-time-color-row" role="group" aria-label="Clock colours">
        <span>Colours</span>
        {clockColorSettings.map((colorSetting) => (
          <button
            aria-label={`Choose ${colorSetting.label.toLowerCase()} colour`}
            aria-pressed={activeColorSetting === colorSetting.key}
            className={`date-time-color-button${activeColorSetting === colorSetting.key ? " active" : ""}`}
            key={colorSetting.key}
            onClick={() => setActiveColorSetting(colorSetting.key)}
            type="button"
          >
            <span>{colorSetting.label}</span>
            <span className="date-time-color-swatch" style={{ backgroundColor: settings[colorSetting.key] }} />
          </button>
        ))}
        <div className="date-time-palette" aria-label={`${getColorSettingLabel(activeColorSetting)} colour palette`} role="group">
          <div className="date-time-palette-preview">
            <span>{getColorSettingLabel(activeColorSetting)} colour</span>
            <strong>{settings[activeColorSetting]}</strong>
            <i aria-hidden="true" style={{ backgroundColor: settings[activeColorSetting] }} />
          </div>
          <div className="date-time-palette-grid">
            {clockColorPalette.map((color) => (
              <button
                aria-label={`Use ${color} for ${getColorSettingLabel(activeColorSetting)}`}
                aria-pressed={settings[activeColorSetting].toLowerCase() === color}
                className="date-time-palette-swatch"
                data-color={color}
                key={color}
                onClick={() => changeActiveColor(color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
          <label className="date-time-palette-hex">
            <span>Hex</span>
            <input
              aria-label={`${getColorSettingLabel(activeColorSetting)} hex colour`}
              value={hexDraft}
              onChange={(event) => changeHexDraft(event.currentTarget.value)}
              spellCheck={false}
              type="text"
            />
          </label>
        </div>
      </div>

      <label>
        <span>Date mode</span>
        <select
          value={settings.dateMode}
          onChange={(event) => changeDateTimeWidgetSetting("dateMode", event.target.value as DateTimeDateMode)}
        >
          <option value="hidden">Hidden</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </label>
      <label>
        <span>Date order</span>
        <select
          value={settings.dateOrder}
          onChange={(event) => changeDateTimeWidgetSetting("dateOrder", event.target.value as DateTimeDateOrder)}
        >
          <option value="DMY">Day month year</option>
          <option value="MDY">Month day year</option>
          <option value="YMD">Year month day</option>
        </select>
      </label>
      {settings.dateMode === "short" ? (
        <label>
          <span>Separator</span>
          <select
            value={settings.shortSeparator}
            onChange={(event) => changeDateTimeWidgetSetting("shortSeparator", event.target.value as DateTimeShortSeparator)}
          >
            <option value="dash">Dash</option>
            <option value="dots">Dots</option>
            <option value="gaps">Spaces</option>
            <option value="slashes">Slashes</option>
          </select>
        </label>
      ) : null}
      <label className="context-toggle-row">
        <span>Weekday</span>
        <input
          checked={settings.showWeekday}
          onChange={(event) => changeDateTimeWidgetSetting("showWeekday", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Ordinal day</span>
        <input
          checked={settings.showOrdinalDay}
          onChange={(event) => changeDateTimeWidgetSetting("showOrdinalDay", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Week number</span>
        <input
          checked={settings.showWeekNumber}
          onChange={(event) => changeDateTimeWidgetSetting("showWeekNumber", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Pad date</span>
        <input
          checked={settings.padDate}
          onChange={(event) => changeDateTimeWidgetSetting("padDate", event.target.checked)}
          type="checkbox"
        />
      </label>

      <WidgetVisualControls visual={settings.visual} onChange={(visual) => changeDateTimeWidgetSetting("visual", visual)} />
    </>
  );
}

function getColorSettingLabel(key: ColorSettingKey) {
  return clockColorSettings.find((setting) => setting.key === key)?.label ?? "Clock";
}
