import { useEffect, useRef, useState } from 'react';
import type { WeatherData } from '../store/weatherStore';

export const usePortalReveal = (rawWeather: WeatherData | null, isLoading: boolean) => {
  const [portalOpen, setPortalOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const shouldOpen = Boolean(rawWeather);
    const delay = shouldOpen ? 200 : 0;

    timeoutRef.current = window.setTimeout(() => {
      setPortalOpen(shouldOpen && !isLoading);
      timeoutRef.current = null;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [rawWeather, isLoading]);

  return portalOpen;
};
