import { useEffect, useMemo, useState } from "react";
import type {
  SatelliteApiResponse,
  SatelliteTle,
  SatelliteWithPosition
} from "@sattracker/shared";
import { fetchSatellites, lookupSatelliteById } from "../lib/api";
import { attachLivePositions } from "../lib/satelliteMath";

function mergeUniqueSatellites(
  base: SatelliteTle[],
  additions: SatelliteTle[]
) {
  const map = new Map<number, SatelliteTle>();

  for (const satellite of base) {
    map.set(satellite.noradId, satellite);
  }

  for (const satellite of additions) {
    map.set(satellite.noradId, satellite);
  }

  return [...map.values()];
}

export function useSatellites(group: string, satelliteLimit: number) {
  const [data, setData] = useState<SatelliteApiResponse | null>(null);
  const [baseSatellites, setBaseSatellites] = useState<SatelliteTle[]>([]);
  const [liveSatellites, setLiveSatellites] = useState<SatelliteWithPosition[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setLookupError(null);

        const response = await fetchSatellites(
          group,
          satelliteLimit,
          controller.signal
        );
        const now = new Date();

        if (!active) return;

        setData(response);
        setClock(now);
        setBaseSatellites(response.satellites);
        setLiveSatellites(attachLivePositions(response.satellites, now));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [group, satelliteLimit]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setClock(now);

      if (baseSatellites.length > 0) {
        setLiveSatellites(attachLivePositions(baseSatellites, now));
      }
    }, 10000);

    return () => window.clearInterval(timer);
  }, [baseSatellites]);

  async function lookupSatellite(query: string) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return null;
    }

    try {
      setLookupLoading(true);
      setLookupError(null);

      const response = await lookupSatelliteById(cleanQuery);

      if (response.satellites.length === 0) {
        setLookupError("No satellite found for that NORAD or COSPAR ID.");
        return null;
      }

      const nextBase = mergeUniqueSatellites(
        baseSatellites,
        response.satellites
      );

      setBaseSatellites(nextBase);
      setLiveSatellites(attachLivePositions(nextBase, new Date()));

      return response.satellites[0];
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Satellite lookup failed"
      );
      return null;
    } finally {
      setLookupLoading(false);
    }
  }

  const visibleSatellites = useMemo(
    () => liveSatellites.filter((sat) => sat.position !== null),
    [liveSatellites]
  );

  return {
    data,
    satellites: visibleSatellites,
    loading,
    lookupLoading,
    error,
    lookupError,
    clock,
    lookupSatellite
  };
}
