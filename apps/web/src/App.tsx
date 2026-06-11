import { useMemo, useState } from "react";
import type { SatelliteWithPosition } from "@sattracker/shared";
import EarthScene from "./components/EarthScene";
import SatellitePanel from "./components/SatellitePanel";
import SkyView from "./components/SkyView";
import { useSatellites } from "./hooks/useSatellites";
import {
  getVisibleSatellites,
  type GroundStation
} from "./lib/visibilityMath";

export default function App() {
  const [group, setGroup] = useState("stations");
  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(null);
  const [satelliteLimit, setSatelliteLimit] = useState(250);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [groundStation, setGroundStation] = useState<GroundStation | null>(null);
  const [earthViewActive, setEarthViewActive] = useState(false);

  const {
    data,
    satellites,
    loading,
    lookupLoading,
    error,
    lookupError,
    clock,
    lookupSatellite
  } = useSatellites(group, satelliteLimit);
  const selected =
    satellites.find((satellite) => satellite.noradId === selectedNoradId) ??
    null;

  const visibleSatellites = useMemo(
    () => getVisibleSatellites(groundStation, satellites),
    [groundStation, satellites]
  );

  const visibleNoradIds = useMemo(
    () => new Set(visibleSatellites.map((item) => item.satellite.noradId)),
    [visibleSatellites]
  );

  function handleGroupChange(nextGroup: string) {
    setGroup(nextGroup);
    setSelectedNoradId(null);
  }

  function handleSelectSatellite(satellite: SatelliteWithPosition) {
    setSelectedNoradId(satellite.noradId);
  }

  function handlePlaceGroundStation(station: GroundStation) {
    setGroundStation(station);
  }

  function handleClearStation() {
    setGroundStation(null);
    setEarthViewActive(false);
  }

  return (
    <main className="app">
      <EarthScene
        satellites={satellites}
        selected={selected}
        onSelect={handleSelectSatellite}
        showWeather={showWeather}
        showVisibilityCone={true}
        groundStation={groundStation}
        visibleNoradIds={visibleNoradIds}
        onPlaceGroundStation={handlePlaceGroundStation}
        earthViewActive={earthViewActive}
      />

      <div className="overlay">
        {showDashboard && (
          <SatellitePanel
            selected={selected}
            count={satellites.length}
            source={data?.source}
            updatedAt={data?.updatedAt}
            cached={data?.cached}
            stale={data?.stale}
            warning={data?.warning}
            clock={clock}
            group={group}
            satelliteLimit={satelliteLimit}
            showWeather={showWeather}
            lookupLoading={lookupLoading}
            lookupError={lookupError}
            onGroupChange={handleGroupChange}
            onSatelliteLimitChange={setSatelliteLimit}
            onShowWeatherChange={setShowWeather}
            onLookupSatellite={lookupSatellite}
          />
        )}

        <button
          className="dashboard-toggle"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
        </button>

        <SkyView
          station={groundStation}
          visibleSatellites={visibleSatellites}
          earthViewActive={earthViewActive}
          onEnterEarthView={() => setEarthViewActive(true)}
          onExitEarthView={() => setEarthViewActive(false)}
          onClearStation={handleClearStation}
        />

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
            <small>If a cached copy exists, the app will keep showing approximate red satellite positions instead of clearing the globe.</small>
          </div>
        )}

        <div className="hint">
          Click Earth to place a ground station · Toggle live cloud weather in the panel
        </div>
      </div>
    </main>
  );
}