import type { GroundStation, VisibleSatellite } from "../lib/visibilityMath";

type SkyViewProps = {
  station: GroundStation | null;
  visibleSatellites: VisibleSatellite[];
  earthViewActive: boolean;
  onEnterEarthView: () => void;
  onExitEarthView: () => void;
  onClearStation: () => void;
};

function skyPosition(azimuth: number, elevation: number) {
  const azimuthRad = (azimuth * Math.PI) / 180;
  const radius = ((90 - elevation) / 90) * 46;

  const x = 50 + radius * Math.sin(azimuthRad);
  const y = 50 - radius * Math.cos(azimuthRad);

  return {
    left: `${x}%`,
    top: `${y}%`
  };
}

export default function SkyView({
  station,
  visibleSatellites,
  earthViewActive,
  onEnterEarthView,
  onExitEarthView,
  onClearStation
}: SkyViewProps) {
  if (!station) {
    return (
      <div className="sky-view">
        <div className="sky-view-header">
          <strong>Earth View</strong>
        </div>

        <p className="sky-view-empty">
          Click a location on Earth to place a ground marker. Then press Earth View to enter the simulated sky view.
        </p>
      </div>
    );
  }

  return (
    <div className="sky-view">
      <div className="sky-view-header">
        <div>
          <strong>{earthViewActive ? "Earth View Active" : "Earth View"}</strong>
          <span>
            {station.latitude.toFixed(3)}°, {station.longitude.toFixed(3)}°
          </span>
        </div>

        <div className="sky-view-actions">
          <button onClick={earthViewActive ? onExitEarthView : onEnterEarthView}>
            {earthViewActive ? "Orbit View" : "Earth View"}
          </button>

          <button onClick={onClearStation}>Clear</button>
        </div>
      </div>

      {earthViewActive && (
        <p className="earth-view-help">
          Drag in the scene to look around from this location.
        </p>
      )}

      <div className="sky-dome">
        <div className="sky-ring outer" />
        <div className="sky-ring middle" />
        <div className="sky-ring inner" />

        <span className="sky-n">N</span>
        <span className="sky-e">E</span>
        <span className="sky-s">S</span>
        <span className="sky-w">W</span>

        {visibleSatellites.map((item) => {
          const pos = skyPosition(item.azimuth, item.elevation);

          return (
            <div
              key={`${item.satellite.noradId}-${item.satellite.name}`}
              className="sky-satellite"
              style={pos}
              title={`${item.satellite.name} · ${item.elevation.toFixed(
                1
              )}° elevation`}
            >
              <span />
            </div>
          );
        })}
      </div>

      <div className="visible-list">
        <strong>{visibleSatellites.length} visible satellites</strong>

        {visibleSatellites.slice(0, 8).map((item) => (
          <div key={`${item.satellite.noradId}-${item.satellite.name}`}>
            <span>{item.satellite.name}</span>
            <small>
              Az {item.azimuth.toFixed(0)}° · El{" "}
              {item.elevation.toFixed(1)}°
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}