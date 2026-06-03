import { useEffect, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  LoaderCircle,
  MapPin,
  Moon,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon
} from "lucide-react";
import type { WeatherWidgetSettings } from "../../../domain/canvas";
import { getWidgetSurfaceStyle } from "../widgetSurface";
import { fetchWeatherSnapshot, type WeatherSnapshot } from "./weatherService";

type WeatherWidgetProps = {
  settings: WeatherWidgetSettings;
};

type WeatherStatus =
  | { type: "loading" }
  | { type: "ready"; snapshot: WeatherSnapshot }
  | { type: "error"; message: string };

export function WeatherWidget({ settings }: WeatherWidgetProps) {
  const [status, setStatus] = useState<WeatherStatus>({ type: "loading" });
  const surfaceStyle = getWeatherSurfaceStyle(settings);

  useEffect(() => {
    const controller = new AbortController();
    setStatus({ type: "loading" });

    fetchWeatherSnapshot(settings, controller.signal)
      .then((snapshot) => setStatus({ type: "ready", snapshot }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatus({ type: "error", message: error instanceof Error ? error.message : "Weather unavailable." });
      });

    return () => controller.abort();
  }, [
    settings.latitude,
    settings.longitude,
    settings.units,
    settings.locationName,
    settings.refreshMinutes,
    settings.displayMode
  ]);

  if (status.type === "loading") {
    return (
      <section className="weather-widget widget-surface weather-widget-loading" aria-label="Weather loading" style={surfaceStyle}>
        <LoaderCircle aria-hidden="true" className="weather-spin" />
        <span>Loading weather</span>
      </section>
    );
  }

  if (status.type === "error") {
    return (
      <section className="weather-widget widget-surface weather-widget-error" aria-label="Weather error" style={surfaceStyle}>
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Weather unavailable</strong>
          <span>{status.message}</span>
        </div>
      </section>
    );
  }

  return <WeatherSnapshotView settings={settings} snapshot={status.snapshot} surfaceStyle={surfaceStyle} />;
}

function WeatherSnapshotView({
  settings,
  snapshot,
  surfaceStyle
}: {
  settings: WeatherWidgetSettings;
  snapshot: WeatherSnapshot;
  surfaceStyle: CSSProperties;
}) {
  const Icon = getWeatherIcon(snapshot);
  const mode = settings.displayMode;
  const showExpanded = mode === "expanded";

  return (
    <section className={`weather-widget widget-surface weather-widget-${mode}`} aria-label={`Weather for ${snapshot.locationName}`} style={surfaceStyle}>
      <div className="weather-primary">
        <span className={`weather-icon weather-tone-${snapshot.condition.tone}`} aria-hidden="true">
          <Icon />
        </span>
        <div className="weather-temp-group">
          <strong>{formatTemperature(snapshot.temperature, snapshot.units.temperature)}</strong>
          <span>{snapshot.condition.label}</span>
        </div>
      </div>

      {mode !== "compact" ? (
        <div className="weather-secondary">
          <span className="weather-location"><MapPin aria-hidden="true" />{snapshot.locationName}</span>
          {settings.showFeelsLike ? (
            <span><Thermometer aria-hidden="true" />Feels {formatTemperature(snapshot.apparentTemperature, snapshot.units.temperature)}</span>
          ) : null}
        </div>
      ) : (
        <span className="weather-compact-location">{snapshot.locationName}</span>
      )}

      {showExpanded ? (
        <div className="weather-details">
          {settings.showHumidity ? <WeatherDetail icon={Droplets} label="Humidity" value={`${snapshot.humidity}%`} /> : null}
          {settings.showWind ? (
            <WeatherDetail icon={Wind} label="Wind" value={`${snapshot.windSpeed} ${snapshot.units.windSpeed}`} />
          ) : null}
          {settings.showPrecipitation ? (
            <WeatherDetail icon={Umbrella} label="Rain" value={`${snapshot.precipitation} ${snapshot.units.precipitation}`} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function getWeatherSurfaceStyle(settings: WeatherWidgetSettings) {
  return {
    ...getWidgetSurfaceStyle(settings),
    "--widget-padding": "clamp(12px, 8%, 18px)",
    "--widget-radius": "24px"
  } as CSSProperties;
}

function WeatherDetail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="weather-detail">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function getWeatherIcon(snapshot: WeatherSnapshot): LucideIcon {
  if (snapshot.condition.tone === "clear") {
    return snapshot.isDay ? Sun : Moon;
  }

  const icons: Record<WeatherSnapshot["condition"]["tone"], LucideIcon> = {
    clear: Sun,
    cloud: Cloud,
    fog: CloudFog,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning
  };

  return icons[snapshot.condition.tone];
}

function formatTemperature(value: number, unit: string) {
  return `${value}${unit}`;
}
