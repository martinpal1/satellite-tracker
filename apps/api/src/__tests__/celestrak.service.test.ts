import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import {
  clampSatelliteLimit,
  getSatellitesByGroup,
  parseTle
} from "../services/celestrak.service.js";
import { clearCache } from "../services/tle-cache.service.js";

const sampleTle = `ISS (ZARYA)
1 25544U 98067A   24123.50000000  .00016717  00000+0  30462-3 0  9993
2 25544  51.6416 167.2967 0004087 265.6543  94.3992 15.50000000450000
HST
1 20580U 90037B   24123.25000000  .00000500  00000+0  20000-4 0  9991
2 20580  28.4697 200.0000 0003000 120.0000 240.0000 15.09200000123456`;

async function resetCaches() {
  clearCache();
  const dir = await mkdtemp(path.join(tmpdir(), "sattracker-tle-cache-"));
  process.env.TLE_CACHE_DIR = dir;
  return async () => {
    await rm(dir, { recursive: true, force: true });
  };
}

describe("CelesTrak service", () => {
  beforeEach(async () => {
    await resetCaches();
  });

  it("clamps requested satellite limits", () => {
    assert.equal(clampSatelliteLimit(undefined), 250);
    assert.equal(clampSatelliteLimit("0"), 1);
    assert.equal(clampSatelliteLimit("25.9"), 25);
    assert.equal(clampSatelliteLimit("99999"), 2000);
    assert.equal(clampSatelliteLimit("bad"), 250);
  });

  it("parses valid TLE records up to the requested limit", () => {
    const satellites = parseTle(sampleTle, "active", 1);

    assert.equal(satellites.length, 1);
    assert.equal(satellites[0].name, "ISS (ZARYA)");
    assert.equal(satellites[0].noradId, 25544);
    assert.equal(satellites[0].cosparId, "1998-067A");
    assert.equal(satellites[0].uncertain, false);
  });

  it("marks parsed satellites as uncertain when stale TLE fallback is used", () => {
    const satellites = parseTle(sampleTle, "active", 1, true);

    assert.equal(satellites[0].uncertain, true);
  });

  it("sends required headers and reuses cached raw TLE for different limits", async () => {
    const calls: RequestInfo[] = [];

    globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => {
      calls.push(input);
      assert.equal((init?.headers as Record<string, string>)["User-Agent"], "SatTracker/1.0 local student project; contact=local-dev");
      assert.equal((init?.headers as Record<string, string>).Accept, "text/plain,*/*");
      assert.match(String(input), /GROUP=ACTIVE/);
      return new Response(sampleTle, { status: 200 });
    }) as typeof fetch;

    const first = await getSatellitesByGroup("active", 1);
    const second = await getSatellitesByGroup("active", 2);

    assert.equal(first.count, 1);
    assert.equal(second.count, 2);
    assert.equal(calls.length, 1);
  });

  it("uses stale disk-cached TLE data if a later CelesTrak request is blocked", async () => {
    let calls = 0;
    const originalNow = Date.now;

    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(sampleTle, { status: 200 });
    }) as typeof fetch;

    const first = await getSatellitesByGroup("starlink", 1);
    assert.equal(first.count, 1);
    assert.equal(first.stale, false);
    assert.equal(calls, 1);

    clearCache();
    Date.now = () => originalNow() + 1000 * 60 * 60 * 3;

    try {
      globalThis.fetch = (async () => {
        calls += 1;
        return new Response("Forbidden", { status: 403 });
      }) as typeof fetch;

      const second = await getSatellitesByGroup("starlink", 2);
      assert.equal(second.count, 2);
      assert.equal(second.cached, true);
      assert.equal(second.stale, true);
      assert.equal(second.accuracy, "stale");
      assert.equal(second.satellites.every((satellite) => satellite.uncertain), true);
      assert.match(second.warning ?? "", /approximate/i);
      assert.equal(calls, 2);
    } finally {
      Date.now = originalNow;
    }
  });

  it("deduplicates simultaneous requests for the same CelesTrak group", async () => {
    let calls = 0;

    globalThis.fetch = (async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(sampleTle, { status: 200 });
    }) as typeof fetch;

    const [first, second] = await Promise.all([
      getSatellitesByGroup("active", 1),
      getSatellitesByGroup("active", 2)
    ]);

    assert.equal(first.count, 1);
    assert.equal(second.count, 2);
    assert.equal(calls, 1);
  });

  it("adds a cooldown after CelesTrak returns 403 and stops repeat fetch attempts", async () => {
    let calls = 0;

    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("Forbidden", { status: 403 });
    }) as typeof fetch;

    await assert.rejects(() => getSatellitesByGroup("active", 1), /HTTP 403/);
    await assert.rejects(() => getSatellitesByGroup("active", 1), /HTTP 403/);

    assert.equal(calls, 1);
  });
});
