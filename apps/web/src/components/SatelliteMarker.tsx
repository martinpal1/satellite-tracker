import { useMemo, useRef } from "react";
import { Mesh } from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { SatelliteWithPosition } from "@sattracker/shared";

type SatelliteMarkerProps = {
  satellite: SatelliteWithPosition;
  selected: boolean;
  onSelect: (satellite: SatelliteWithPosition) => void;
};

function colourForCategory(category: string) {
  switch (category) {
    case "stations":
      return "#00ffff";
    case "weather":
      return "#00ff88";
    case "gps-ops":
      return "#ff44aa";
    case "starlink":
      return "#8888ff";
    case "geo":
      return "#ffff44";
    case "science":
      return "#55ffcc";
    default:
      return "#ffffff";
  }
}

export default function SatelliteMarker({
  satellite,
  selected,
  onSelect
}: SatelliteMarkerProps) {
  const meshRef = useRef<Mesh>(null);

  const colour = useMemo(
    () => colourForCategory(satellite.category),
    [satellite.category]
  );

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    const scale = selected ? 1.9 : 1;
    meshRef.current.scale.setScalar(scale);
  });

  if (!satellite.position) {
    return null;
  }

  return (
    <group
      position={[
        satellite.position.x,
        satellite.position.y,
        satellite.position.z
      ]}
    >
      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(satellite);
        }}
      >
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color={selected ? "#00ffff" : colour} />
      </mesh>

      {selected && (
        <Html
          position={[0.16, 0.12, 0]}
          center={false}
          distanceFactor={8}
          occlude={false}
          zIndexRange={[100, 0]}
        >
          <div className="satellite-popup">
            <div className="satellite-popup-header">
              <span className="satellite-popup-dot" style={{ background: colour }} />
              <strong>{satellite.name}</strong>
            </div>

            <div className="satellite-popup-grid">
              <span>NORAD</span>
              <strong>{satellite.noradId || "Unknown"}</strong>

              <span>Category</span>
              <strong>{satellite.category}</strong>

              <span>Latitude</span>
              <strong>{satellite.position.latitude.toFixed(3)}°</strong>

              <span>Longitude</span>
              <strong>{satellite.position.longitude.toFixed(3)}°</strong>

              <span>Altitude</span>
              <strong>{satellite.position.altitudeKm.toFixed(1)} km</strong>

              <span>TLE Epoch</span>
              <strong>{satellite.epoch}</strong>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}