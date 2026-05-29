import type { SatelliteApiResponse, SatelliteTle } from "@sattracker/shared";
import { getCached, setCached } from "./tle-cache.service.js";

const CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php";
const CACHE_TTL_MS = 1000 * 60 * 15;

function parseNoradId(line1: string): number {
  const raw = line1.slice(2, 7).trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEpoch(line1: string): string {
  const epochRaw = line1.slice(18, 32).trim();

  if (epochRaw.length < 5) {
    return "Unknown";
  }

  return epochRaw;
}

function parseTle(raw: string, category: string, limit: number): SatelliteTle[] {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const satellites: SatelliteTle[] = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (!line1?.startsWith("1 ") || !line2?.startsWith("2 ")) {
      continue;
    }

    satellites.push({
      name: name.replace(/^0 /, "").trim(),
      noradId: parseNoradId(line1),
      line1,
      line2,
      category,
      epoch: parseEpoch(line1)
    });

    if (satellites.length >= limit) {
      break;
    }
  }

  return satellites;
}

export async function getSatellitesByGroup(
  group: string,
  limit: number
): Promise<SatelliteApiResponse> {
  const cacheKey = `celestrak:${group}:${limit}`;
  const cached = getCached<SatelliteApiResponse>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cached: true
    };
  }

  const url = new URL(CELESTRAK_BASE_URL);
  url.searchParams.set("GROUP", group);
  url.searchParams.set("FORMAT", "tle");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CelesTrak request failed with status ${response.status}`);
  }

  const raw = await response.text();
  const satellites = parseTle(raw, group, limit);

  const payload: SatelliteApiResponse = {
    source: "CelesTrak",
    group,
    count: satellites.length,
    updatedAt: new Date().toISOString(),
    cached: false,
    satellites
  };

  setCached(cacheKey, payload, CACHE_TTL_MS);

  return payload;
}