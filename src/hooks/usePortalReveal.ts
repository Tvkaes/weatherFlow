import { useEffect, useState } from 'react';
import type { WeatherData } from '../store/weatherStore';

export const usePortalReveal = (rawWeather: WeatherData | null, isLoading: boolean) => {
  const [portalOpen, setPortalOpen] = useState(false);

  useEffect(() => {
    if (rawWeather && !portalOpen) {
      const timeout = window.setTimeout(() => setPortalOpen(true), 200);
      return () => window.clearTimeout(timeout);
    }

    if (!isLoading && !rawWeather) {
      setPortalOpen(false);
    }
  }, [rawWeather, portalOpen, isLoading]);

  return portalOpen;
};
