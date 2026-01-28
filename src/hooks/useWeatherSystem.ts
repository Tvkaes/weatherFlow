import { useCallback, useEffect, useRef } from 'react';
import { useWeatherStore } from '../store/weatherStore';
import type { HourlyForecast, DailyForecast, WeatherData } from '../store/weatherStore';
import { reverseGeocodeLabel } from '@/utils/geocoding';

const OPEN_METEO_API = import.meta.env.DEV ? '/open-meteo/v1/forecast' : 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = import.meta.env.DEV
  ? '/geocoding-api/v1/search'
  : 'https://geocoding-api.open-meteo.com/v1/search';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
    cloud_cover: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    surface_pressure: number[];
    cloud_cover: number[];
    is_day?: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
    sunrise: string[];
    sunset: string[];
  };
}

interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  }>;
}

const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatHour = (timeStr: string): string => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
};

const findHourlyIndicesForDate = (targetDate: string, times: string[]): number[] =>
  times.reduce<number[]>((acc, time, idx) => {
    if (time.startsWith(targetDate)) acc.push(idx);
    return acc;
  }, []);

const buildFallbackLabel = (lat: number, lon: number) => `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
const isFallbackLabel = (label: string | null | undefined) => Boolean(label && label.startsWith('Lat '));

const selectRepresentativeIndex = (indices: number[], times: string[]): number | null => {
  if (indices.length === 0) return null;
  const midday = indices.find((idx) => times[idx].includes('12:00'));
  if (midday !== undefined) return midday;
  return indices[Math.floor(indices.length / 2)];
};

const deriveWeatherSnapshot = (
  date: string,
  data: OpenMeteoResponse,
  options?: { targetHour?: string | null }
): WeatherData | null => {
  const dayIndex = data.daily.time.findIndex((d) => d === date);
  if (dayIndex === -1) return null;

  const hourlyIndices = findHourlyIndicesForDate(date, data.hourly.time);
  let representativeIdx: number | null = null;

  if (options?.targetHour) {
    const hourIdx = data.hourly.time.findIndex((time) => time === options.targetHour);
    if (hourIdx !== -1) {
      representativeIdx = hourIdx;
    }
  }

  if (representativeIdx === null) {
    representativeIdx = selectRepresentativeIndex(hourlyIndices, data.hourly.time);
  }

  if (representativeIdx === null) return null;

  const [sunriseIso, sunsetIso] = [data.daily.sunrise[dayIndex], data.daily.sunset[dayIndex]];

  return {
    temperature: data.hourly.temperature_2m[representativeIdx],
    humidity: data.hourly.relative_humidity_2m[representativeIdx],
    windSpeed: data.hourly.wind_speed_10m[representativeIdx],
    windDirection: data.hourly.wind_direction_10m[representativeIdx] ?? 0,
    pressure: data.hourly.surface_pressure[representativeIdx] ?? 1013,
    cloudCover: data.hourly.cloud_cover[representativeIdx] ?? 0,
    precipitation: data.hourly.precipitation[representativeIdx],
    weatherCode: data.hourly.weather_code[representativeIdx],
    isDay: data.hourly.is_day ? data.hourly.is_day[representativeIdx] === 1 : true,
    sunrise: sunriseIso.split('T')[1],
    sunset: sunsetIso.split('T')[1],
    observationTime: data.hourly.time[representativeIdx],
  };
};

export const useWeatherSystem = () => {
  const {
    rawWeather,
    normalized,
    atmosphere,
    location,
    isLoading,
    error,
    mood,
    headline,
    lastUpdated,
    hourlyForecast,
    dailyForecast,
    activeDate,
    activeHour,
    setWeatherData,
    setForecastData,
    setHourlyForecast,
    setLocation,
    setLoading,
    setError,
    setActiveDate,
    setActiveHour,
  } = useWeatherStore();

  const intervalRef = useRef<number | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchWeatherByCoords = useCallback(async (
    lat: number,
    lon: number,
    options?: { targetDate?: string | null; targetHour?: string | null }
  ) => {
    const targetDate = options?.targetDate ?? null;
    const targetHour = options?.targetHour ?? null;
    setLoading(true);

    // Cancel any in-flight request to prevent race conditions
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'wind_direction_10m',
          'surface_pressure',
          'cloud_cover',
          'precipitation',
          'weather_code',
          'is_day',
        ].join(','),
        hourly: [
          'temperature_2m',
          'weather_code',
          'precipitation',
          'relative_humidity_2m',
          'wind_speed_10m',
          'wind_direction_10m',
          'surface_pressure',
          'cloud_cover',
          'is_day',
        ].join(','),
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'weather_code',
          'precipitation_sum',
          'sunrise',
          'sunset',
        ].join(','),
        timezone: 'auto',
      });

      if (targetDate) {
        params.set('start_date', targetDate);
        params.set('end_date', targetDate);
      } else {
        params.set('forecast_days', '8');
      }

      const response = await fetch(`${OPEN_METEO_API}?${params}`, {
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: OpenMeteoResponse = await response.json();

      const mapHourlyRange = (startIndex = 0, endIndex = data.hourly.time.length): HourlyForecast[] =>
        data.hourly.time.slice(startIndex, endIndex).map((time, offset) => {
          const absoluteIdx = startIndex + offset;
          return {
            time: formatHour(time),
            isoTime: time,
            temperature: data.hourly.temperature_2m[absoluteIdx],
            weatherCode: data.hourly.weather_code[absoluteIdx],
            precipitation: data.hourly.precipitation[absoluteIdx],
            humidity: data.hourly.relative_humidity_2m[absoluteIdx],
            windSpeed: data.hourly.wind_speed_10m[absoluteIdx],
            isDay: data.hourly.is_day ? data.hourly.is_day[absoluteIdx] === 1 : undefined,
            observationTime: time,
          };
        });

      if (targetDate) {
        const snapshot = deriveWeatherSnapshot(targetDate, data, { targetHour });
        if (!snapshot) {
          throw new Error('No weather data for selected date');
        }
        setWeatherData(snapshot);
        setActiveDate(targetDate);
        setActiveHour(targetHour ?? null);

        const hourlyData = mapHourlyRange();
        setHourlyForecast(hourlyData);
      } else {
        // Set current weather
        setWeatherData({
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          pressure: data.current.surface_pressure,
          cloudCover: data.current.cloud_cover,
          precipitation: data.current.precipitation,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          sunrise: data.daily.sunrise[0].split('T')[1],
          sunset: data.daily.sunset[0].split('T')[1],
          observationTime: data.current.time,
        });

        // Process hourly forecast (next 24 hours)
        const currentHour = new Date().getHours();
        const hourlyData = mapHourlyRange(currentHour, currentHour + 24);

        // Process daily forecast (7 days)
        const dailyData: DailyForecast[] = data.daily.time
          .slice(1, 8)
          .map((date, idx) => ({
            date,
            dayName: getDayName(date),
            temperatureMax: data.daily.temperature_2m_max[idx + 1],
            temperatureMin: data.daily.temperature_2m_min[idx + 1],
            weatherCode: data.daily.weather_code[idx + 1],
            precipitation: data.daily.precipitation_sum[idx + 1],
            sunrise: data.daily.sunrise[idx + 1].split('T')[1],
            sunset: data.daily.sunset[idx + 1].split('T')[1],
          }));

        setForecastData(hourlyData, dailyData);
        setActiveDate(null);
        setActiveHour(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was aborted because a newer request started; keep latest loading state
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [setWeatherData, setForecastData, setHourlyForecast, setLoading, setError, setActiveDate, setActiveHour]);

  const searchLocation = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        name: query,
        count: '1',
        language: 'en',
        format: 'json',
      });

      const response = await fetch(`${GEOCODING_API}?${params}`);
      const data: GeocodingResult = await response.json();

      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, country } = data.results[0];
        setLocation(latitude, longitude, `${name}, ${country}`);
        await fetchWeatherByCoords(latitude, longitude);
      } else {
        setError('Location not found');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search location');
      setLoading(false);
    }
  }, [fetchWeatherByCoords, setLocation, setError, setLoading]);

  const searchLocationByCoords = useCallback(
    async (latitude: number, longitude: number, label: string) => {
      setLocation(latitude, longitude, label);
      await fetchWeatherByCoords(latitude, longitude);
    },
    [fetchWeatherByCoords, setLocation]
  );

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let resolvedLabel: string | null = null;
        try {
          resolvedLabel = await reverseGeocodeLabel(latitude, longitude, { language: 'es' });
        } catch {
          // swallow reverse geocoding errors, we'll fall back to coordinates
        }

        const finalLabel = resolvedLabel ?? buildFallbackLabel(latitude, longitude);
        setLocation(latitude, longitude, finalLabel);
        await fetchWeatherByCoords(latitude, longitude);
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        // Fallback to default location (San Francisco)
        setLocation(37.7749, -122.4194, 'San Francisco, US');
        fetchWeatherByCoords(37.7749, -122.4194);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchWeatherByCoords, setLocation, setLoading, setError]);

  const refresh = useCallback(() => {
    if (location) {
      fetchWeatherByCoords(location.lat, location.lon, { targetDate: activeDate, targetHour: activeHour });
    }
  }, [location, fetchWeatherByCoords, activeDate, activeHour]);

  const loadDateWeather = useCallback(
    (date: string | null) => {
      if (!location) return;
      setActiveHour(null);
      if (!date) {
        fetchWeatherByCoords(location.lat, location.lon);
      } else {
        fetchWeatherByCoords(location.lat, location.lon, { targetDate: date });
      }
    },
    [location, fetchWeatherByCoords, setActiveHour]
  );

  const loadHourWeather = useCallback(
    (isoTime: string) => {
      if (!location) return;
      const [date] = isoTime.split('T');
      if (!date) return;
      fetchWeatherByCoords(location.lat, location.lon, { targetDate: date, targetHour: isoTime });
    },
    [location, fetchWeatherByCoords]
  );

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (location) {
      intervalRef.current = window.setInterval(() => {
        fetchWeatherByCoords(location.lat, location.lon, { targetDate: activeDate, targetHour: activeHour });
      }, 5 * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [location, fetchWeatherByCoords, activeDate, activeHour]);

  // Abort any in-flight request if this hook unmounts
  useEffect(() => {
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!location || !isFallbackLabel(location.name)) return;
    let cancelled = false;

    (async () => {
      try {
        const resolved = await reverseGeocodeLabel(location.lat, location.lon, { language: 'es' });
        if (cancelled || !resolved || resolved === location.name) return;
        setLocation(location.lat, location.lon, resolved);
      } catch {
        // noop, we'll keep fallback label until a future attempt succeeds
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, setLocation]);

  // Initial load
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    // Raw data
    rawWeather,
    location,
    isLoading,
    error,
    lastUpdated,
    
    // Forecasts
    hourlyForecast,
    dailyForecast,
    activeDate,
    
    // Normalized (0-1) values for shaders
    normalized,
    
    // Computed atmospheric visuals
    atmosphere,
    
    // Micro-copy
    mood,
    headline,
    
    // Actions
    searchLocation,
    searchLocationByCoords,
    getCurrentLocation,
    refresh,
    loadDateWeather,
    loadHourWeather,
  };
};
