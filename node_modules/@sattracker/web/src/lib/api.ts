import type { SatelliteApiResponse } from "@sattracker/shared";

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