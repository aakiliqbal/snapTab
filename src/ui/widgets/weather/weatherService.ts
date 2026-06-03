import type { WeatherWidgetSettings } from "../../../domain/canvas";

export type WeatherCondition = {
  code: number;
  label: string;
  tone: "clear" | "cloud" | "rain" | "storm" | "snow" | "fog";
};

export type WeatherLocationResult = {
  name: string;
  latitude: number;
  longitude: number;
};

export type WeatherSnapshot = {
  locationName: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  isDay: boolean;
  units: {
    temperature: string;
    precipitation: string;
    windSpeed: string;
  };
  condition: WeatherCondition;
  fetchedAt: number;
};

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }>;
};

type OpenMeteoForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    is_day?: number;
  };
  current_units?: {
    temperature_2m?: string;
    precipitation?: string;
    wind_speed_10m?: string;
  };
};

const cache = new Map<string, WeatherSnapshot>();

export async function resolveWeatherLocation(query: string, signal?: AbortSignal): Promise<WeatherLocationResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Enter a location.");
  }

  const params = new URLSearchParams({ name: trimmedQuery, count: "1", language: "en", format: "json" });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Location lookup failed.");
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;
  const result = data.results?.[0];
  if (!result) {
    throw new Error("Location not found.");
  }

  return {
    name: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
    latitude: result.latitude,
    longitude: result.longitude
  };
}

export async function fetchWeatherSnapshot(settings: WeatherWidgetSettings, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const cacheKey = `${settings.latitude.toFixed(3)}:${settings.longitude.toFixed(3)}:${settings.units}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < settings.refreshMinutes * 60_000) {
    return cached;
  }

  const params = new URLSearchParams({
    latitude: String(settings.latitude),
    longitude: String(settings.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day"
    ].join(","),
    timezone: "auto"
  });

  if (settings.units === "fahrenheit") {
    params.set("temperature_unit", "fahrenheit");
  }

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Weather fetch failed.");
  }

  const data = (await response.json()) as OpenMeteoForecastResponse;
  if (!data.current) {
    throw new Error("Weather data unavailable.");
  }

  const snapshot: WeatherSnapshot = {
    locationName: settings.locationName,
    temperature: roundWeatherValue(data.current.temperature_2m),
    apparentTemperature: roundWeatherValue(data.current.apparent_temperature),
    humidity: roundWeatherValue(data.current.relative_humidity_2m),
    precipitation: roundWeatherValue(data.current.precipitation, 1),
    windSpeed: roundWeatherValue(data.current.wind_speed_10m),
    windDirection: roundWeatherValue(data.current.wind_direction_10m),
    isDay: data.current.is_day !== 0,
    units: {
      temperature: data.current_units?.temperature_2m ?? (settings.units === "fahrenheit" ? "°F" : "°C"),
      precipitation: data.current_units?.precipitation ?? "mm",
      windSpeed: data.current_units?.wind_speed_10m ?? "km/h"
    },
    condition: describeWeatherCode(data.current.weather_code ?? 0),
    fetchedAt: Date.now()
  };

  cache.set(cacheKey, snapshot);
  return snapshot;
}

export function describeWeatherCode(code: number): WeatherCondition {
  if (code === 0) {
    return { code, label: "Clear sky", tone: "clear" };
  }

  if ([1, 2].includes(code)) {
    return { code, label: "Partly cloudy", tone: "cloud" };
  }

  if (code === 3) {
    return { code, label: "Overcast", tone: "cloud" };
  }

  if ([45, 48].includes(code)) {
    return { code, label: "Fog", tone: "fog" };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { code, label: "Rain", tone: "rain" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { code, label: "Snow", tone: "snow" };
  }

  if ([95, 96, 99].includes(code)) {
    return { code, label: "Thunderstorm", tone: "storm" };
  }

  return { code, label: "Cloudy", tone: "cloud" };
}

function roundWeatherValue(value: number | undefined, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}
