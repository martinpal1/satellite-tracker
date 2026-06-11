import { useState } from "react";
import type { SatelliteTle, SatelliteWithPosition } from "@sattracker/shared";

type SatellitePanelProps = {
  selected: SatelliteWithPosition | null;
  count: number;
  source?: string;
  updatedAt?: string;
  cached?: boolean;
  stale?: boolean;
  warning?: string;
  clock: Date;
  group: string;
  satelliteLimit: number;
  showWeather: boolean;
  lookupLoading: boolean;
  lookupError: string | null;
  onGroupChange: (group: string) => void;
  onSatelliteLimitChange: (limit: number) => void;
  onShowWeatherChange: (show: boolean) => void;
  onLookupSatellite: (query: string) => Promise<SatelliteTle | null>;
};

const GROUPS = [
  { label: "Active", value: "active" },
  { label: "Stations", value: "stations" },
  { label: "Weather", value: "weather" },
  { label: "GPS", value: "gps-ops" },
  { label: "Starlink", value: "starlink" },
  { label: "Geo", value: "geo" },
  { label: "Science", value: "science" },
  { label: "Visual", value: "visual" },
  { label: "CubeSats", value: "cubesat" },
  { label: "Amateur", value: "amateur" },
  { label: "Last 30 days", value: "last-30-days" },
  { label: "Debris", value: "debris" }
];

const SATELLITE_LIMITS = [50, 100, 250, 500, 1000, 2000];

export default function SatellitePanel({
  selected,
  count,
  source,
  updatedAt,
  cached,
  stale,
  warning,
  clock,
  group,
  satelliteLimit,
  showWeather,
  lookupLoading,
  lookupError,
  onGroupChange,
  onSatelliteLimitChange,
  onShowWeatherChange,
  onLookupSatellite
}: SatellitePanelProps) {
  const [lookupQuery, setLookupQuery] = useState("");

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLookupSatellite(lookupQuery);
  }

  return (
    <aside className="panel">
      <header>
        <h1>SatTracker</h1>
        <p>{count} satellites shown</p>
      </header>

      {stale && (
        <section className="uncertainty-banner">
          <strong>Approximate mode</strong>
          <p>{warning ?? "Live data is unavailable. Red satellites use stale cached TLE data."}</p>
        </section>
      )}

      <label>
        Satellite type
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
      </label>

      <label>
        Satellites to show
        <select
          value={satelliteLimit}
          onChange={(event) => onSatelliteLimitChange(Number(event.target.value))}
        >
          {SATELLITE_LIMITS.map((limit) => (
            <option key={limit} value={limit}>
              {limit}
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={showWeather}
          onChange={(event) => onShowWeatherChange(event.target.checked)}
        />
        Show live cloud weather
      </label>

      <form onSubmit={handleLookup}>
        <label>
          Find satellite
          <div className="lookup-row">
            <input
              value={lookupQuery}
              onChange={(event) => setLookupQuery(event.target.value)}
              placeholder="NORAD or COSPAR ID"
            />
            <button type="submit" disabled={lookupLoading}>
              {lookupLoading ? "..." : "Find"}
            </button>
          </div>
        </label>
        {lookupError && <small>{lookupError}</small>}
      </form>

      <section>
        <p>UTC: {clock.toUTCString().slice(17, 25)}</p>
        <p>Source: {source ?? "Loading"}</p>
        <p>Cache: {stale ? "stale" : cached ? "hit" : "live"}</p>
        <p>
          TLE loaded: {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "--"}
        </p>
      </section>

      <section>
        <strong>Selected</strong>
        <p>
          {selected
            ? `${selected.name} · NORAD ${selected.noradId}${
                selected.cosparId && selected.cosparId !== "Unknown"
                  ? ` · COSPAR ${selected.cosparId}`
                  : ""
              }`
            : "None"}
        </p>
        {selected?.uncertain && (
          <small className="uncertain-text">This position is approximate.</small>
        )}
      </section>
    </aside>
  );
}
