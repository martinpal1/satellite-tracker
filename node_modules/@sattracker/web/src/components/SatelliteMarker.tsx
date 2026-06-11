import { Html } from "@react-three/drei";
import type { SatelliteWithPosition } from "@sattracker/shared";

type SatelliteMarkerProps = {
  satellite: SatelliteWithPosition;
  selected: boolean;
  visibleFromStation: boolean;
  earthViewActive: boolean;
  onSelect: (satellite: SatelliteWithPosition) => void;
};

export default function SatelliteMarker({
  satellite,
  selected,
  visibleFromStation,
  earthViewActive,
  onSelect
}: SatelliteMarkerProps) {
  if (!satellite.position) return null;
  if (earthViewActive && !visibleFromStation) return null;

  const markerColour = satellite.uncertain
    ? "#ff0000"
    : selected || visibleFromStation
      ? "#ffffff"
      : "#d0d0d0";
  const markerSize = selected ? 0.05 : 0.032;
  const markerTitle = satellite.uncertain
    ? `${satellite.name} - approximate stale-data position`
    : satellite.name;

  return (
    <group
      position={[
        satellite.position.x,
        satellite.position.y,
        satellite.position.z
      ]}
    >
      {earthViewActive && visibleFromStation ? (
        <Html center occlude={false} zIndexRange={[100, 0]}>
          <button
            className={[
              "earth-view-satellite-marker",
              selected ? "selected" : "",
              satellite.uncertain ? "uncertain-marker-label" : ""
            ].filter(Boolean).join(" ")}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(satellite);
            }}
            title={markerTitle}
          >
            {satellite.name}
          </button>
        </Html>
      ) : (
        <mesh
          scale={visibleFromStation ? 1.3 : 1}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(satellite);
          }}
        >
          <sphereGeometry args={[markerSize, 8, 8]} />
          <meshBasicMaterial color={markerColour} />
        </mesh>
      )}

      {selected && (
        <Html
          position={[0.16, 0.12, 0]}
          center={false}
          occlude={false}
          zIndexRange={[100, 0]}
        >
          <div className="satellite-popup">
            <strong>{satellite.name}</strong>
            {satellite.uncertain && (
              <p className="uncertain-text">Approximate stale-data position</p>
            )}
            <p>NORAD: {satellite.noradId || "Unknown"}</p>
            <p>Category: {satellite.category}</p>
            <p>Lat: {satellite.position.latitude.toFixed(3)}°</p>
            <p>Lon: {satellite.position.longitude.toFixed(3)}°</p>
            <p>Alt: {satellite.position.altitudeKm.toFixed(1)} km</p>
          </div>
        </Html>
      )}
    </group>
  );
}
