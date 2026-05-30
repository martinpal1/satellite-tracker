import { useState } from "react";
import type { SatelliteWithPosition } from "@sattracker/shared";
import EarthScene from "./components/EarthScene";
import SatellitePanel from "./components/SatellitePanel";
import { useSatellites } from "./hooks/useSatellites";

export default function App() {
  const [group, setGroup] = useState("stations");
  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);

  const { data, satellites, loading, error, clock } = useSatellites(group);

  const selected =
    satellites.find((satellite) => satellite.noradId === selectedNoradId) ??
    null;

  function handleGroupChange(nextGroup: string) {
    setGroup(nextGroup);
    setSelectedNoradId(null);
  }

  function handleSelectSatellite(satellite: SatelliteWithPosition) {
    setSelectedNoradId(satellite.noradId);
  }

  return (
    <main className="app">
      <EarthScene
        satellites={satellites}
        selected={selected}
        onSelect={handleSelectSatellite}
        showWeather={true}
        showVisibilityCone={true}
      />

      <div className="overlay">
        {showDashboard && (
          <SatellitePanel
            selected={selected}
            count={satellites.length}
            source={data?.source}
            updatedAt={data?.updatedAt}
            cached={data?.cached}
            clock={clock}
            group={group}
            onGroupChange={handleGroupChange}
          />
        )}

        <button
          className="dashboard-toggle"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
        </button>

        {loading && (
          <div className="loading">
            <strong>Loading live TLE data...</strong>
            <span>Connecting to SATTRACKER API</span>
          </div>
        )}

        {error && (
          <div className="error-box">
            <strong>Data error</strong>
            <span>{error}</span>
          </div>
        )}

        <div className="hint">
          Drag to rotate · Scroll to zoom · Click a satellite to inspect
        </div>
      </div>
    </main>
  );
}