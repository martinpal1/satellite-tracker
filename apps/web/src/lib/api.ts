import type { SatelliteApiResponse } from "@sattracker/shared";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function buildApiUrl(path: string): URL {
  return new URL(path, API_BASE_URL);
}

async function requestJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const body = await response.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // Keep the generic message when the API returns non-JSON errors.
    }

    if (response.status === 503 && message.includes("CelesTrak returned HTTP")) {
      message = "CelesTrak is temporarily blocking this IP because TLE data was requested too often. The app will stop retrying this query for a while. Try again later, or keep using any cached satellite data already shown.";
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchSatellites(
  group: string,
  limit = 250,
  signal?: AbortSignal
): Promise<SatelliteApiResponse> {
  const url = buildApiUrl("/api/satellites");

  url.searchParams.set("group", group);
  url.searchParams.set("limit", String(limit));

  return requestJson<SatelliteApiResponse>(url, signal);
}

export async function lookupSatelliteById(
  query: string
): Promise<SatelliteApiResponse> {
  const url = buildApiUrl("/api/satellites/lookup");

  url.searchParams.set("q", query);

  return requestJson<SatelliteApiResponse>(url);
}
