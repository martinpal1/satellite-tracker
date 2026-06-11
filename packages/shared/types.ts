export type SatelliteDataAccuracy = "live" | "cached" | "stale";

export type SatelliteTle = {
  name: string;
  noradId: number;
  cosparId?: string;
  line1: string;
  line2: string;
  category: string;
  epoch: string;
  /**
   * True when the app is propagating the satellite from stale cached TLE data
   * because current CelesTrak data could not be fetched.
   */
  uncertain?: boolean;
};

export type SatelliteApiResponse = {
  source: string;
  group: string;
  count: number;
  updatedAt: string;
  cached: boolean;
  stale: boolean;
  accuracy: SatelliteDataAccuracy;
  dataAgeMs?: number;
  warning?: string;
  satellites: SatelliteTle[];
};

export type SatellitePosition = {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  x: number;
  y: number;
  z: number;
};

export type SatelliteWithPosition = SatelliteTle & {
  position: SatellitePosition | null;
};
