import { Html } from "@react-three/drei";
import { latLonToScenePosition } from "../lib/satelliteMath";
import type { GroundStation } from "../lib/visibilityMath";

type GroundMarkerProps = {
  station: GroundStation | null;
};

export default function GroundMarker({ station }: GroundMarkerProps) {
  if (!station) {
    return null;
  }

  const position = latLonToScenePosition(
    station.latitude,
    station.longitude,
    2.075
  );

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#ffea00" />
      </mesh>

      <Html position={[0.08, 0.08, 0]} distanceFactor={8}>
        <div className="ground-marker-label">
          Ground Station
        </div>
      </Html>
    </group>
  );
}