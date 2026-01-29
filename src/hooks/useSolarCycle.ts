import { useMemo } from 'react';
import type { WeatherData } from '@/store/weatherStore';

export interface SolarCycleData {
  isAvailable: boolean;
  sunProgressPercent: number;
  remainingLightPercent: number;
  daylightDurationLabel: string | null;
  sunriseLabel: string;
  sunsetLabel: string;
  nowLabel: string;
}

const formatSolarTime = (value?: string | null) => {
  if (!value) return '--:--';
  const [hours = '--', minutes = '--'] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const buildDateFromTimeString = (value?: string | null, reference?: Date | string | null) => {
  if (!value) return null;
  const [h = '0', m = '0'] = value.split(':');
  const base = reference ? new Date(reference) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(Number(h));
  base.setMinutes(Number(m));
  base.setSeconds(0);
  base.setMilliseconds(0);
  return base;
};

export const useSolarCycle = (rawWeather: WeatherData | null): SolarCycleData => {
  return useMemo(() => {
    if (!rawWeather) {
      return {
        isAvailable: false,
        sunProgressPercent: 0,
        remainingLightPercent: 100,
        daylightDurationLabel: null,
        sunriseLabel: '--:--',
        sunsetLabel: '--:--',
        nowLabel: '--:--',
      };
    }

    const sunriseDate = buildDateFromTimeString(rawWeather.sunrise, rawWeather.observationTime);
    const sunsetDate = buildDateFromTimeString(rawWeather.sunset, rawWeather.observationTime);
    const now = rawWeather.observationTime ? new Date(rawWeather.observationTime) : new Date();

    let daylightPercent = 0;
    let daylightDurationLabel: string | null = null;

    if (sunriseDate && sunsetDate && sunsetDate > sunriseDate) {
      const total = sunsetDate.getTime() - sunriseDate.getTime();
      const elapsed = Math.min(Math.max(0, now.getTime() - sunriseDate.getTime()), total);
      daylightPercent = total ? (elapsed / total) * 100 : 0;
      const minutes = Math.round(total / 60000);
      daylightDurationLabel = `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
    }

    const sunProgressPercent = Math.min(100, Math.max(0, daylightPercent));

    return {
      isAvailable: Boolean(sunriseDate && sunsetDate),
      sunProgressPercent,
      remainingLightPercent: Math.max(0, 100 - sunProgressPercent),
      daylightDurationLabel,
      sunriseLabel: formatSolarTime(rawWeather.sunrise),
      sunsetLabel: formatSolarTime(rawWeather.sunset),
      nowLabel: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [rawWeather]);
};
