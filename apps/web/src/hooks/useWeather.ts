import { useEffect, useState } from "react";
import type { WeatherApiResponse } from "@sattracker/shared";
import { fetchWeather } from "../lib/api";

export function useWeather() {
  const [data, setData] = useState<WeatherApiResponse | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const response = await fetchWeather();

        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Weather error");
        }
      }
    }

    load();

    const timer = window.setInterval(load, 1000 * 60 * 15);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return {
    weather: data,
    weatherEnabled: enabled,
    setWeatherEnabled: setEnabled,
    weatherError: error
  };
}