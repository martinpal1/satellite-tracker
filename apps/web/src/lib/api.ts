import type { SatelliteApiResponse } from "@sattracker/shared";
import type { WeatherApiResponse } from "@sattracker/shared";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function fetchSatellites(
  group: string,
  limit = 80
): Promise<SatelliteApiResponse> {
  const url = new URL("/api/satellites", API_BASE_URL);
  url.searchParams.set("group", group);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch satellites: ${response.status}`);
  }

  return response.json();
}

export async function fetchWeather(): Promise<WeatherApiResponse> {
  const url = new URL("/api/weather", API_BASE_URL);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status}`);
  }

  return response.json();
}