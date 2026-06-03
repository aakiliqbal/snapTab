import { useEffect, useState, type FormEvent } from "react";
import type { WeatherDisplayMode, WeatherUnits, WeatherWidgetSettings, WidgetState } from "../../../domain/canvas";
import { RangeRow, WidgetVisualControls } from "../WidgetContextMenuControls";
import { resolveWeatherLocation } from "./weatherService";

type WeatherWidgetContextMenuProps = {
  changeWeatherWidgetSetting: <K extends keyof WeatherWidgetSettings>(key: K, value: WeatherWidgetSettings[K]) => void;
  setEnabled: (enabled: boolean) => void;
  weatherWidget: WidgetState<WeatherWidgetSettings>;
};

export function WeatherWidgetContextMenu({
  changeWeatherWidgetSetting,
  setEnabled,
  weatherWidget
}: WeatherWidgetContextMenuProps) {
  const [locationDraft, setLocationDraft] = useState(weatherWidget.settings.locationName);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    setLocationDraft(weatherWidget.settings.locationName);
  }, [weatherWidget.settings.locationName]);

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocationStatus("Searching...");

    try {
      const result = await resolveWeatherLocation(locationDraft);
      changeWeatherWidgetSetting("locationName", result.name);
      changeWeatherWidgetSetting("latitude", result.latitude);
      changeWeatherWidgetSetting("longitude", result.longitude);
      setLocationDraft(result.name);
      setLocationStatus("Location updated");
    } catch (error) {
      setLocationStatus(error instanceof Error ? error.message : "Location lookup failed.");
    }
  }

  return (
    <>
      <header className="widget-context-header">
        <span>Widget</span>
        <strong>Weather</strong>
      </header>
      <label className="context-toggle-row">
        <span>Enabled</span>
        <input checked={weatherWidget.enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
      </label>

      <form className="weather-context-location" onSubmit={saveLocation}>
        <label>
          <span>Location</span>
          <input
            onChange={(event) => setLocationDraft(event.target.value)}
            placeholder="London"
            type="text"
            value={locationDraft}
          />
        </label>
        <button type="submit">Find location</button>
        {locationStatus ? <p>{locationStatus}</p> : null}
      </form>

      <label>
        <span>Units</span>
        <select
          value={weatherWidget.settings.units}
          onChange={(event) => changeWeatherWidgetSetting("units", event.target.value as WeatherUnits)}
        >
          <option value="celsius">Celsius</option>
          <option value="fahrenheit">Fahrenheit</option>
        </select>
      </label>

      <label>
        <span>Display</span>
        <select
          value={weatherWidget.settings.displayMode}
          onChange={(event) => changeWeatherWidgetSetting("displayMode", event.target.value as WeatherDisplayMode)}
        >
          <option value="compact">Compact</option>
          <option value="standard">Standard</option>
          <option value="expanded">Expanded</option>
        </select>
      </label>

      <RangeRow
        label="Refresh"
        max={120}
        min={5}
        onChange={(value) => changeWeatherWidgetSetting("refreshMinutes", value)}
        suffix=" min"
        value={weatherWidget.settings.refreshMinutes}
      />

      <WidgetVisualControls visual={weatherWidget.settings.visual} onChange={(visual) => changeWeatherWidgetSetting("visual", visual)} />

      <label className="context-toggle-row">
        <span>Feels like</span>
        <input
          checked={weatherWidget.settings.showFeelsLike}
          onChange={(event) => changeWeatherWidgetSetting("showFeelsLike", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Humidity</span>
        <input
          checked={weatherWidget.settings.showHumidity}
          onChange={(event) => changeWeatherWidgetSetting("showHumidity", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Wind</span>
        <input
          checked={weatherWidget.settings.showWind}
          onChange={(event) => changeWeatherWidgetSetting("showWind", event.target.checked)}
          type="checkbox"
        />
      </label>
      <label className="context-toggle-row">
        <span>Precipitation</span>
        <input
          checked={weatherWidget.settings.showPrecipitation}
          onChange={(event) => changeWeatherWidgetSetting("showPrecipitation", event.target.checked)}
          type="checkbox"
        />
      </label>
    </>
  );
}
