import type { WeatherApiResponse, WeatherPoint } from "@sattracker/shared";
import { getCached, setCached } from "./tle-cache.service.js";

const CACHE_TTL_MS = 1000 * 60 * 15;

function buildWeatherGrid() {
  const points: { latitude: number; longitude: number }[] = [];

  for (let lat = -60; lat <= 60; lat += 15) {
    for (let lon = -180; lon <= 165; lon += 15) {
      points.push({ latitude: lat, longitude: lon });
    }
  }

  return points;
}

export async function getGlobalWeather(): Promise<WeatherApiResponse> {
  const cacheKey = "openmeteo:global-weather";
  const cached = getCached<WeatherApiResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  const grid = buildWeatherGrid();

  const latitudes = grid.map((p) => p.latitude).join(",");
  const longitudes = grid.map((p) => p.longitude).join(",");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitudes);
  url.searchParams.set("longitude", longitudes);
  url.searchParams.set("current", "cloud_cover,precipitation");
  url.searchParams.set("timezone", "GMT");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const raw = await response.json();

  const records = Array.isArray(raw) ? raw : [raw];

  const points: WeatherPoint[] = records.map((item: any, index: number) => ({
    latitude: grid[index]?.latitude ?? item.latitude,
    longitude: grid[index]?.longitude ?? item.longitude,
    cloudCover: Number(item.current?.cloud_cover ?? 0),
    precipitation: Number(item.current?.precipitation ?? 0)
  }));

  const payload: WeatherApiResponse = {
    source: "Open-Meteo",
    updatedAt: new Date().toISOString(),
    count: points.length,
    points
  };

  setCached(cacheKey, payload, CACHE_TTL_MS);

  return payload;
}