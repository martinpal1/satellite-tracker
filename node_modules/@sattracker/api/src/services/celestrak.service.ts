import type {
  SatelliteApiResponse,
  SatelliteDataAccuracy,
  SatelliteTle
} from "@sattracker/shared";
import { readDiskCache, writeDiskCache } from "./disk-cache.service.js";
import { getCached, setCached } from "./tle-cache.service.js";

const CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php";
const PAYLOAD_CACHE_TTL_MS = 1000 * 60 * 15;
const RAW_TLE_FRESH_TTL_MS = 1000 * 60 * 60 * 2;
const RAW_TLE_STALE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CELESTRAK_ERROR_COOLDOWN_MS = 1000 * 60 * 60 * 2;

export const DEFAULT_SATELLITE_LIMIT = 250;
export const MAX_SATELLITE_LIMIT = 2000;

export type RawTleFetchResult = {
  raw: string;
  cached: boolean;
  stale: boolean;
  ageMs?: number;
};

const inFlightRawRequests = new Map<string, Promise<RawTleFetchResult>>();

export function clampSatelliteLimit(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_SATELLITE_LIMIT);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_SATELLITE_LIMIT;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_SATELLITE_LIMIT);
}

function parseNoradId(line1: string): number {
  const parsed = Number(line1.slice(2, 7).trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEpoch(line1: string): string {
  const epochRaw = line1.slice(18, 32).trim();
  return epochRaw.length >= 5 ? epochRaw : "Unknown";
}

function parseInternationalDesignator(line1: string): string {
  const year = line1.slice(9, 11).trim();
  const launchNumber = line1.slice(11, 14).trim();
  const piece = line1.slice(14, 17).trim();

  if (!year || !launchNumber || !piece) {
    return "Unknown";
  }

  const fullYear = Number(year) >= 57 ? `19${year}` : `20${year}`;
  return `${fullYear}-${launchNumber}${piece}`;
}

export function parseTle(
  raw: string,
  category: string,
  limit: number,
  uncertain = false
): SatelliteTle[] {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const satellites: SatelliteTle[] = [];

  for (let i = 0; i < lines.length - 2 && satellites.length < limit; i += 3) {
    const [name, line1, line2] = [lines[i], lines[i + 1], lines[i + 2]];

    if (!line1?.startsWith("1 ") || !line2?.startsWith("2 ")) {
      continue;
    }

    satellites.push({
      name: name.replace(/^0 /, "").trim(),
      noradId: parseNoradId(line1),
      cosparId: parseInternationalDesignator(line1),
      line1,
      line2,
      category,
      epoch: parseEpoch(line1),
      uncertain
    });
  }

  return satellites;
}

function buildCelestrakUrl(params: Record<string, string>) {
  const url = new URL(CELESTRAK_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key.toUpperCase(), value.toUpperCase());
  }

  url.searchParams.set("FORMAT", "TLE");
  return url;
}

function buildBlockedMessage(url: URL, status: number, body: string) {
  const detail = body.replace(/\s+/g, " ").trim();
  const suffix = detail ? ` CelesTrak response: ${detail.slice(0, 300)}` : "";

  return (
    `CelesTrak returned HTTP ${status} for ${url.toString()}. ` +
    "This usually means the data source is temporarily blocking this IP because the same GP/TLE data was requested too often. " +
    "The backend will use stale cached TLE data where available and will pause this exact live request before trying again." +
    suffix
  );
}

function isPossiblyTle(raw: string) {
  return /\n1\s+\d{5}/.test(raw) && /\n2\s+\d{5}/.test(raw);
}

function staleWarning(ageMs?: number) {
  const hours = ageMs ? Math.max(1, Math.round(ageMs / (1000 * 60 * 60))) : null;
  const ageText = hours ? ` The cached TLE is about ${hours} hour${hours === 1 ? "" : "s"} old.` : "";

  return (
    "Live CelesTrak data is unavailable, so positions are approximate and propagated from old cached TLE data." +
    ageText +
    " Red satellite markers mean the app is not using current live data."
  );
}

async function fetchCelestrakTle(params: Record<string, string>): Promise<RawTleFetchResult> {
  const url = buildCelestrakUrl(params);
  const cacheKey = `celestrak:raw:${url.search}`;
  const existingRequest = inFlightRawRequests.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchCelestrakTleInternal(url, cacheKey);
  inFlightRawRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inFlightRawRequests.delete(cacheKey);
  }
}

async function fetchCelestrakTleInternal(
  url: URL,
  cacheKey: string
): Promise<RawTleFetchResult> {
  const cooldownKey = `celestrak:cooldown:${url.search}`;

  const memoryCached = getCached<string>(cacheKey);
  if (memoryCached) {
    return { raw: memoryCached, cached: true, stale: false, ageMs: 0 };
  }

  const diskCached = await readDiskCache<string>(cacheKey);
  if (diskCached && diskCached.ageMs <= RAW_TLE_FRESH_TTL_MS) {
    setCached(cacheKey, diskCached.value, RAW_TLE_FRESH_TTL_MS - diskCached.ageMs);
    return {
      raw: diskCached.value,
      cached: true,
      stale: false,
      ageMs: diskCached.ageMs
    };
  }

  const cooldownMessage = getCached<string>(cooldownKey);
  if (cooldownMessage) {
    if (diskCached && diskCached.ageMs <= RAW_TLE_STALE_TTL_MS) {
      return {
        raw: diskCached.value,
        cached: true,
        stale: true,
        ageMs: diskCached.ageMs
      };
    }

    throw new Error(cooldownMessage);
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/plain,*/*",
        "User-Agent": "SatTracker/1.0 local student project; contact=local-dev"
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const message = buildBlockedMessage(url, response.status, body);

      if (response.status === 403 || response.status === 404 || response.status === 429) {
        setCached(cooldownKey, message, CELESTRAK_ERROR_COOLDOWN_MS);
      }

      if (diskCached && diskCached.ageMs <= RAW_TLE_STALE_TTL_MS) {
        return {
          raw: diskCached.value,
          cached: true,
          stale: true,
          ageMs: diskCached.ageMs
        };
      }

      throw new Error(message);
    }

    const raw = await response.text();

    if (!isPossiblyTle(`\n${raw}`)) {
      throw new Error("CelesTrak returned a response that does not look like TLE data.");
    }

    setCached(cacheKey, raw, RAW_TLE_FRESH_TTL_MS);
    await writeDiskCache(cacheKey, raw);

    return { raw, cached: false, stale: false, ageMs: 0 };
  } catch (error) {
    if (diskCached && diskCached.ageMs <= RAW_TLE_STALE_TTL_MS) {
      return {
        raw: diskCached.value,
        cached: true,
        stale: true,
        ageMs: diskCached.ageMs
      };
    }

    throw error;
  }
}

function sourceLabel(cached: boolean, stale: boolean) {
  if (stale) return "CelesTrak stale cache";
  if (cached) return "CelesTrak cached";
  return "CelesTrak live";
}

function accuracyLabel(cached: boolean, stale: boolean): SatelliteDataAccuracy {
  if (stale) return "stale";
  if (cached) return "cached";
  return "live";
}

function makePayload(
  raw: string,
  group: string,
  limit: number,
  fetchResult: RawTleFetchResult
): SatelliteApiResponse {
  const satellites = parseTle(raw, group, limit, fetchResult.stale);

  return {
    source: sourceLabel(fetchResult.cached, fetchResult.stale),
    group,
    count: satellites.length,
    updatedAt: new Date().toISOString(),
    cached: fetchResult.cached,
    stale: fetchResult.stale,
    accuracy: accuracyLabel(fetchResult.cached, fetchResult.stale),
    dataAgeMs: fetchResult.ageMs,
    warning: fetchResult.stale ? staleWarning(fetchResult.ageMs) : undefined,
    satellites
  };
}

export async function getSatellitesByGroup(
  group: string,
  requestedLimit: number
): Promise<SatelliteApiResponse> {
  const limit = clampSatelliteLimit(requestedLimit);
  const normalisedGroup = group.toLowerCase();
  const payloadCacheKey = `celestrak:group:${normalisedGroup}:${limit}`;
  const cached = getCached<SatelliteApiResponse>(payloadCacheKey);

  if (cached) {
    return cached;
  }

  const fetchResult = await fetchCelestrakTle({ GROUP: normalisedGroup });
  const payload = makePayload(fetchResult.raw, normalisedGroup, limit, fetchResult);

  setCached(payloadCacheKey, payload, PAYLOAD_CACHE_TTL_MS);
  return payload;
}

export async function lookupSatellite(query: string): Promise<SatelliteApiResponse> {
  const cleanQuery = query.trim().toUpperCase();

  if (!cleanQuery) {
    throw new Error("Missing satellite lookup query");
  }

  const isNoradId = /^\d{1,9}$/.test(cleanQuery);
  const normalisedCospar = cleanQuery.replace(/\s+/g, "").replace(/^COSPAR:/, "");
  const params: Record<string, string> = isNoradId
    ? { CATNR: cleanQuery }
    : { INTDES: normalisedCospar };
  const cacheKey = `celestrak:lookup:${JSON.stringify(params)}`;
  const cached = getCached<SatelliteApiResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  const fetchResult = await fetchCelestrakTle(params);
  const payload = makePayload(fetchResult.raw, "lookup", 25, fetchResult);

  setCached(cacheKey, payload, PAYLOAD_CACHE_TTL_MS);
  return payload;
}
