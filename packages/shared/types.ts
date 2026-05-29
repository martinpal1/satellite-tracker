export type SatelliteTle = {
  name: string;
  noradId: number;
  line1: string;
  line2: string;
  category: string;
  epoch: string;
};

export type SatelliteApiResponse = {
  source: string;
  group: string;
  count: number;
  updatedAt: string;
  cached: boolean;
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