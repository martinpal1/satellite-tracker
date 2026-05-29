import { useMemo, useRef } from "react";
import { Mesh } from "three";
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
      return "#0c0cee";
    case "geo":
      return "#ffff00";
    case "science":
      return "#00ffb3";
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

    const scale = selected ? 1.8 : 1;
    meshRef.current.scale.setScalar(scale);
  });

  if (!satellite.position) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[
        satellite.position.x,
        satellite.position.y,
        satellite.position.z
      ]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(satellite);
      }}
    >
      <sphereGeometry args={[0.035, 12, 12]} />
      <meshBasicMaterial color={selected ? "#00ffff" : colour} />
    </mesh>
  );
}