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

export function DateTimeWidgetContextMenu({
  changeDateTimeWidgetSetting,
  dateTimeWidget,
  setEnabled
}: DateTimeWidgetContextMenuProps) {
  const settings = dateTimeWidget.settings;

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
