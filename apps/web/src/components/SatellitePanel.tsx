import type { SatelliteWithPosition } from "@sattracker/shared";

type SatellitePanelProps = {
  selected: SatelliteWithPosition | null;
  count: number;
  source?: string;
  updatedAt?: string;
  cached?: boolean;
  clock: Date;
  group: string;
  onGroupChange: (group: string) => void;
};

const GROUPS = [
  { label: "Active Satellites", value: "active" },
  { label: "ISS / Stations", value: "stations" },
  { label: "Weather Satellites", value: "weather" },
  { label: "GPS Satellites", value: "gps-ops" },
  { label: "Starlink", value: "starlink" },
  { label: "Geostationary", value: "geo" },
  { label: "Science Satellites", value: "science" }
];

export default function SatellitePanel({
  selected,
  count,
  source,
  updatedAt,
  cached,
  clock,
  group,
  onGroupChange
}: SatellitePanelProps) {
  return (
    <aside className="dashboard-bar">
      <div className="dashboard-brand">
        <h1>SATTRACKER</h1>
        <span>Live orbital intelligence</span>
      </div>

      <div className="dashboard-control">
        <span>Satellite Type</span>

        <select
          value={group}
          onChange={(event) => onGroupChange(event.target.value)}
        >
          {GROUPS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-item">
        <span>Tracked</span>
        <strong>{count}</strong>
      </div>

      <div className="dashboard-item">
        <span>UTC</span>
        <strong>{clock.toUTCString().slice(17, 25)}</strong>
      </div>

      <div className="dashboard-item">
        <span>Source</span>
        <strong>{source ?? "Loading"}</strong>
      </div>

      <div className="dashboard-item">
        <span>Cache</span>
        <strong>{cached ? "HIT" : "LIVE"}</strong>
      </div>

      <div className="dashboard-item">
        <span>TLE Loaded</span>
        <strong>
          {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "--"}
        </strong>
      </div>

      <div className="dashboard-item">
        <span>Position Refresh</span>
        <strong>{clock.toLocaleTimeString()}</strong>
      </div>

      <div className="dashboard-selected">
        <span>Selected Satellite</span>

        {!selected && <strong>None selected</strong>}

        {selected && (
          <strong>
            {selected.name} ·{" "}
            {selected.position
              ? `${selected.position.latitude.toFixed(2)}°, ${selected.position.longitude.toFixed(2)}°`
              : "No position"}
          </strong>
        )}
      </div>
    </aside>
  );
}