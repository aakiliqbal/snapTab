import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DateTimeWidgetSettings } from "../../../domain/canvas";
import { getWidgetSurfaceStyle } from "../widgetSurface";

type DateTimeWidgetProps = {
  settings: DateTimeWidgetSettings;
};

const separators: Record<DateTimeWidgetSettings["shortSeparator"], string> = {
  dash: "-",
  dots: ".",
  gaps: " ",
  slashes: "/"
};

export function DateTimeWidget({ settings }: DateTimeWidgetProps) {
  const now = useCurrentDate(settings);
  const surfaceStyle = getDateTimeSurfaceStyle(settings);
  const timeParts = getTimeParts(now, settings);
  const dateText = getDateText(now, settings);
  const weekText = settings.showWeekNumber ? `Week ${getIsoWeekNumber(now)}` : null;

  return (
    <section className="date-time-widget widget-surface" aria-label="Date and time" style={surfaceStyle}>
      <ClockView now={now} settings={settings} timeParts={timeParts} />
      {settings.dateMode !== "hidden" ? (
        <div className="date-time-date-group">
          <span>{dateText}</span>
          {weekText ? <small>{weekText}</small> : null}
        </div>
      ) : null}
    </section>
  );
}

function ClockView({
  now,
  settings,
  timeParts
}: {
  now: Date;
  settings: DateTimeWidgetSettings;
  timeParts: ReturnType<typeof getTimeParts>;
}) {
  if (settings.clockMode === "percentageComplete") {
    const percent = getDayPercent(now);
    return (
      <div className="date-time-percentage" aria-label={`${percent}% of today complete`}>
        <strong style={{ color: settings.hourColor }}>{percent}%</strong>
        <span><span style={{ color: settings.minuteColor }}>day</span> <span style={{ color: settings.secondColor }}>complete</span></span>
      </div>
    );
  }

  if (settings.clockMode === "verticalClock") {
    return (
      <div className="date-time-vertical" aria-label={timeParts.accessibleLabel}>
        <strong style={{ color: settings.hourColor }}>{timeParts.hour}</strong>
        <strong style={{ color: settings.minuteColor }}>{timeParts.minute}</strong>
        {settings.showSeconds ? <strong style={{ color: settings.secondColor }}>{timeParts.second}</strong> : null}
        {timeParts.period ? <span>{timeParts.period}</span> : null}
      </div>
    );
  }

  return (
    <div className="date-time-digital" aria-label={timeParts.accessibleLabel}>
      <strong>
        <span className="date-time-part" style={{ color: settings.hourColor }}>{timeParts.hour}</span>
        <span>:</span>
        <span className="date-time-part" style={{ color: settings.minuteColor }}>{timeParts.minute}</span>
        {settings.showSeconds ? (
          <>
            <span>:</span>
            <span className="date-time-part" style={{ color: settings.secondColor }}>{timeParts.second}</span>
          </>
        ) : null}
      </strong>
      {timeParts.period ? <span>{timeParts.period}</span> : null}
    </div>
  );
}

function useCurrentDate(settings: DateTimeWidgetSettings) {
  const [now, setNow] = useState(() => new Date());
  const tickToSecond = settings.showSeconds || settings.clockMode === "verticalClock";

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleNextTick() {
      setNow(new Date());
      const current = Date.now();
      const interval = tickToSecond ? 1000 : 60_000;
      timer = setTimeout(scheduleNextTick, interval - (current % interval));
    }

    function resyncWhenVisible() {
      if (document.visibilityState === "visible") {
        setNow(new Date());
      }
    }

    scheduleNextTick();
    document.addEventListener("visibilitychange", resyncWhenVisible);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", resyncWhenVisible);
    };
  }, [tickToSecond, settings.timezone]);

  return now;
}

function getTimeParts(now: Date, settings: DateTimeWidgetSettings) {
  const timeZone = settings.timezone === "auto" ? undefined : settings.timezone;
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: settings.showSeconds ? "2-digit" : undefined,
    hour12: settings.timeFormat === "twelveHour",
    timeZone
  }).formatToParts(now);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const rawHour = getPart("hour");
  const hour = settings.padHour && rawHour.length === 1 ? `0${rawHour}` : rawHour;
  const minute = getPart("minute");
  const second = getPart("second");
  const period = getPart("dayPeriod");
  const accessibleLabel = [hour, minute, settings.showSeconds ? second : null, period].filter(Boolean).join(" ");

  return { hour, minute, second, period, accessibleLabel };
}

function getDateText(now: Date, settings: DateTimeWidgetSettings) {
  if (settings.dateMode === "short") {
    return getShortDateText(now, settings);
  }

  return getLongDateText(now, settings);
}

function getLongDateText(now: Date, settings: DateTimeWidgetSettings) {
  const timeZone = settings.timezone === "auto" ? undefined : settings.timezone;
  const weekday = settings.showWeekday
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(now)
    : null;
  const dayValue = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(now);
  const day = settings.showOrdinalDay ? ordinal(Number(dayValue)) : dayValue;
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(now);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(now);
  const ordered = orderDateParts(settings.dateOrder, { day, month, year });

  return [weekday, ordered.join(" ")].filter(Boolean).join(", ");
}

function getShortDateText(now: Date, settings: DateTimeWidgetSettings) {
  const timeZone = settings.timezone === "auto" ? undefined : settings.timezone;
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone
  }).formatToParts(now);
  const readPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const pad = (value: string) => (settings.padDate && value.length === 1 ? `0${value}` : value);
  const separator = separators[settings.shortSeparator];
  return orderDateParts(settings.dateOrder, {
    day: pad(readPart("day")),
    month: pad(readPart("month")),
    year: readPart("year")
  }).join(separator);
}

function orderDateParts(order: DateTimeWidgetSettings["dateOrder"], parts: { day: string; month: string; year: string }) {
  if (order === "MDY") {
    return [parts.month, parts.day, parts.year];
  }

  if (order === "YMD") {
    return [parts.year, parts.month, parts.day];
  }

  return [parts.day, parts.month, parts.year];
}

function ordinal(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function getDayPercent(now: Date) {
  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return Math.floor((elapsed / 86_400) * 100);
}

function getIsoWeekNumber(now: Date) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function getDateTimeSurfaceStyle(settings: DateTimeWidgetSettings) {
  return {
    ...getWidgetSurfaceStyle(settings),
    "--widget-padding": "clamp(14px, 8%, 22px)",
    "--widget-radius": "26px"
  } as CSSProperties;
}
