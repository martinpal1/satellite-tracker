import type { SatelliteWithPosition } from "@sattracker/shared";

type SatellitePanelProps = {
  selected: SatelliteWithPosition | null;
  count: number;
  source?: string;
  updatedAt?: string;
  cached?: boolean;
  clock: Date;
};

export default function SatellitePanel({
  selected,
  count,
  source,
  updatedAt,
  cached,
  clock
}: SatellitePanelProps) {
  return (
    <aside className="panel">
      <div className="panel-header">
        <h1>SATTRACKER</h1>
        <p>Live orbital intelligence dashboard</p>
      </div>

      <div className="stat-grid">
        <div>
          <strong>{count}</strong>
          <span>Tracked</span>
        </div>

        <div>
          <strong>{clock.toUTCString().slice(17, 25)}</strong>
          <span>UTC</span>
        </div>
      </div>

      <div className="data-source">
        <div>
          <span>Source</span>
          <strong>{source ?? "Loading"}</strong>
        </div>

        <div>
          <span>Cache</span>
          <strong>{cached ? "HIT" : "LIVE"}</strong>
        </div>

        <div>
          <span>TLE Loaded</span>
          <strong>
            {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "--"}
          </strong>
        </div>

        <div>
          <span>Position Refresh</span>
          <strong>{clock.toLocaleTimeString()}</strong>
        </div>
      </div>

      <div className="selected-card">
        <h2>Selected Satellite</h2>

        {!selected && (
          <p className="muted">Click a satellite marker to inspect it.</p>
        )}

        {selected && (
          <div className="sat-details">
            <h3>{selected.name}</h3>

            <div>
              <span>NORAD ID</span>
              <strong>{selected.noradId || "Unknown"}</strong>
            </div>

            <div>
              <span>Category</span>
              <strong>{selected.category}</strong>
            </div>

            <div>
              <span>Latitude</span>
              <strong>
                {selected.position
                  ? `${selected.position.latitude.toFixed(3)}°`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>Longitude</span>
              <strong>
                {selected.position
                  ? `${selected.position.longitude.toFixed(3)}°`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>Altitude</span>
              <strong>
                {selected.position
                  ? `${selected.position.altitudeKm.toFixed(1)} km`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>TLE Epoch</span>
              <strong>{selected.epoch}</strong>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}