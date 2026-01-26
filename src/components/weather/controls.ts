import { createContext, useContext, type MutableRefObject } from 'react';

export interface WeatherControls {
  windSpeed: number;
  windX: number;
  windZ: number;
  precipitationIntensity: number;
  snowIntensity: number;
  visibility: number;
  cloudDensity: number;
  fogDensity: number;
  isThunderActive: boolean;
  lightningFlash: number;
}

export const WeatherControlsContext = createContext<MutableRefObject<WeatherControls> | null>(null);

export type WeatherControlsUpdater = <K extends keyof WeatherControls>(key: K, value: WeatherControls[K]) => void;

export const WeatherControlsUpdateContext = createContext<WeatherControlsUpdater | null>(null);

export const useWeatherControls = () => {
  const ctx = useContext(WeatherControlsContext);
  if (!ctx) {
    throw new Error('WeatherControlsContext is missing. Wrap components with <Atmosphere />.');
  }
  return ctx;
};

export const useWeatherControlsUpdater = () => {
  const updater = useContext(WeatherControlsUpdateContext);
  if (!updater) {
    throw new Error('WeatherControlsUpdateContext is missing. Wrap components with <Atmosphere />.');
  }
  return updater;
};
