import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SatelliteTle } from "@sattracker/shared";
import { attachLivePositions, latLonToScenePosition } from "../satelliteMath";

const staleSatellite: SatelliteTle = {
  name: "ISS (ZARYA)",
  noradId: 25544,
  cosparId: "1998-067A",
  category: "active",
  epoch: "24123.50000000",
  line1: "1 25544U 98067A   24123.50000000  .00016717  00000+0  30462-3 0  9993",
  line2: "2 25544  51.6416 167.2967 0004087 265.6543  94.3992 15.50000000450000",
  uncertain: true
};

describe("satelliteMath", () => {
  it("converts equator and prime meridian to the positive X axis", () => {
    assert.deepEqual(latLonToScenePosition(0, 0, 2), { x: 2, y: 0, z: -0 });
  });

  it("converts the north pole to the positive Y axis", () => {
    const position = latLonToScenePosition(90, 0, 2);

    assert.ok(Math.abs(position.x) < 1e-12);
    assert.equal(position.y, 2);
    assert.ok(Math.abs(position.z) < 1e-12);
  });

  it("preserves stale-data uncertainty when calculating approximate current positions", () => {
    const [positioned] = attachLivePositions([staleSatellite], new Date("2024-05-02T12:00:00Z"));

    assert.equal(positioned.uncertain, true);
    assert.ok(positioned.position);
  });
});
