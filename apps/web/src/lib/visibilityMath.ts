import type { SatelliteWithPosition } from "@sattracker/shared";

export type GroundStation = {
  latitude: number;
  longitude: number;
};

export type VisibleSatellite = {
  satellite: SatelliteWithPosition;
  azimuth: number;
  elevation: number;
  rangeKm: number;
};

const EARTH_RADIUS_KM = 6371;

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number) {
  return (value * 180) / Math.PI;
}

function geodeticToEcef(latitude: number, longitude: number, altitudeKm: number) {
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const radius = EARTH_RADIUS_KM + altitudeKm;

  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.cos(lat) * Math.sin(lon),
    z: radius * Math.sin(lat)
  };
}

export function calculateLookAngles(
  observer: GroundStation,
  satellite: SatelliteWithPosition
): VisibleSatellite | null {
  if (!satellite.position) {
    return null;
  }

  const observerEcef = geodeticToEcef(
    observer.latitude,
    observer.longitude,
    0
  );

  const satelliteEcef = geodeticToEcef(
    satellite.position.latitude,
    satellite.position.longitude,
    satellite.position.altitudeKm
  );

  const rx = satelliteEcef.x - observerEcef.x;
  const ry = satelliteEcef.y - observerEcef.y;
  const rz = satelliteEcef.z - observerEcef.z;

  const lat = degToRad(observer.latitude);
  const lon = degToRad(observer.longitude);

  const east = -Math.sin(lon) * rx + Math.cos(lon) * ry;

  const north =
    -Math.sin(lat) * Math.cos(lon) * rx -
    Math.sin(lat) * Math.sin(lon) * ry +
    Math.cos(lat) * rz;

  const up =
    Math.cos(lat) * Math.cos(lon) * rx +
    Math.cos(lat) * Math.sin(lon) * ry +
    Math.sin(lat) * rz;

  const horizontalRange = Math.sqrt(east * east + north * north);
  const rangeKm = Math.sqrt(
    east * east + north * north + up * up
  );

  const elevation = radToDeg(Math.atan2(up, horizontalRange));

  let azimuth = radToDeg(Math.atan2(east, north));

  if (azimuth < 0) {
    azimuth += 360;
  }

  if (elevation <= 0) {
    return null;
  }

  return {
    satellite,
    azimuth,
    elevation,
    rangeKm
  };
}

export function getVisibleSatellites(
  observer: GroundStation | null,
  satellites: SatelliteWithPosition[]
): VisibleSatellite[] {
  if (!observer) {
    return [];
  }

  return satellites
    .map((satellite) => calculateLookAngles(observer, satellite))
    .filter((item): item is VisibleSatellite => item !== null)
    .sort((a, b) => b.elevation - a.elevation);
}

export function scenePointToLatLon(point: { x: number; y: number; z: number }) {
  const radius = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);

  const latitude = radToDeg(Math.asin(point.y / radius));
  const longitude = radToDeg(Math.atan2(-point.z, point.x));

  return {
    latitude,
    longitude
  };
}