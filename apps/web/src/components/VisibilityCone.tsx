import { useMemo } from "react";
import * as THREE from "three";
import type { SatelliteWithPosition } from "@sattracker/shared";
import { latLonToScenePosition } from "../lib/satelliteMath";

type VisibilityConeProps = {
  satellite: SatelliteWithPosition | null;
  visible: boolean;
};

const EARTH_RADIUS_SCENE = 2;
const EARTH_RADIUS_KM = 6371;

function makeConeGeometry(
  satellitePosition: THREE.Vector3,
  groundPosition: THREE.Vector3,
  altitudeKm: number
) {
  const satelliteRadius = satellitePosition.length();

  const horizonAngle = Math.acos(
    EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(altitudeKm, 1))
  );

  const footprintRadius =
    EARTH_RADIUS_SCENE * Math.sin(horizonAngle);

  const height = satelliteRadius - EARTH_RADIUS_SCENE;

  const geometry = new THREE.ConeGeometry(
    Math.max(footprintRadius, 0.04),
    Math.max(height, 0.05),
    64,
    1,
    true
  );

  geometry.translate(0, -height / 2, 0);

  const direction = groundPosition
    .clone()
    .sub(satellitePosition)
    .normalize();

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);

  geometry.applyQuaternion(quaternion);
  geometry.translate(
    satellitePosition.x,
    satellitePosition.y,
    satellitePosition.z
  );

  return geometry;
}

export default function VisibilityCone({
  satellite,
  visible
}: VisibilityConeProps) {
  const geometry = useMemo(() => {
    if (!satellite?.position) return null;

    const satPosition = new THREE.Vector3(
      satellite.position.x,
      satellite.position.y,
      satellite.position.z
    );

    const ground = latLonToScenePosition(
      satellite.position.latitude,
      satellite.position.longitude,
      EARTH_RADIUS_SCENE
    );

    const groundPosition = new THREE.Vector3(
      ground.x,
      ground.y,
      ground.z
    );

    return makeConeGeometry(
      satPosition,
      groundPosition,
      satellite.position.altitudeKm
    );
  }, [
    satellite?.noradId,
    satellite?.position?.x,
    satellite?.position?.y,
    satellite?.position?.z,
    satellite?.position?.altitudeKm
  ]);

  if (!visible || !geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.16}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}