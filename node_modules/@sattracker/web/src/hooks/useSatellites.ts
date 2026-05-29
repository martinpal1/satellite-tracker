import { useEffect, useMemo, useState } from "react";
import type {
  SatelliteApiResponse,
  SatelliteWithPosition
} from "@sattracker/shared";
import { fetchSatellites } from "../lib/api";
import { attachLivePositions } from "../lib/satelliteMath";

export function useSatellites(group: string) {
  const [data, setData] = useState<SatelliteApiResponse | null>(null);
  const [liveSatellites, setLiveSatellites] = useState<SatelliteWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchSatellites(group, 120);

        if (!cancelled) {
          setData(response);
          setLiveSatellites(attachLivePositions(response.satellites));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [group]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setClock(now);

      if (data) {
        setLiveSatellites(attachLivePositions(data.satellites, now));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data]);

  const visibleSatellites = useMemo(
    () => liveSatellites.filter((sat) => sat.position !== null),
    [liveSatellites]
  );

  return {
    data,
    satellites: visibleSatellites,
    loading,
    error,
    clock
  };
}