import * as satellite from "satellite.js";
import type {
  SatellitePosition,
  SatelliteTle,
  SatelliteWithPosition
} from "@sattracker/shared";

const EARTH_RADIUS_KM = 6371;
const EARTH_SCENE_RADIUS = 2;

export function getSatellitePosition(
  tle: SatelliteTle,
  date = new Date()
): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const result = satellite.propagate(satrec, date);

    if (!result.position || typeof result.position === "boolean") {
      return null;
    }

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(result.position, gmst);

    const latitude = satellite.degreesLat(geo.latitude);
    const longitude = satellite.degreesLong(geo.longitude);
    const altitudeKm = geo.height;

    const radius = EARTH_SCENE_RADIUS * (1 + altitudeKm / EARTH_RADIUS_KM);

    const latRad = latitude * Math.PI / 180;
    const lonRad = longitude * Math.PI / 180;

    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.sin(latRad);
    const z = -radius * Math.cos(latRad) * Math.sin(lonRad);

    return {
      latitude,
      longitude,
      altitudeKm,
      x,
      y,
      z
    };
  } catch {
    return null;
  }
}

export function attachLivePositions(
  satellites: SatelliteTle[],
  date = new Date()
): SatelliteWithPosition[] {
  return satellites.map((satelliteItem) => ({
    ...satelliteItem,
    position: getSatellitePosition(satelliteItem, date)
  }));
}