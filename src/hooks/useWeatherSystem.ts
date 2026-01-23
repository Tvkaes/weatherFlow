import { useCallback, useEffect, useRef } from 'react';
import { useWeatherStore } from '../store/weatherStore';
import type { HourlyForecast, DailyForecast, WeatherData } from '../store/weatherStore';

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

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

const selectRepresentativeIndex = (indices: number[], times: string[]): number | null => {
  if (indices.length === 0) return null;
  const midday = indices.find((idx) => times[idx].includes('12:00'));
  if (midday !== undefined) return midday;
  return indices[Math.floor(indices.length / 2)];
};

const deriveWeatherSnapshot = (date: string, data: OpenMeteoResponse): WeatherData | null => {
  const dayIndex = data.daily.time.findIndex((d) => d === date);
  if (dayIndex === -1) return null;

  const hourlyIndices = findHourlyIndicesForDate(date, data.hourly.time);
  const representativeIdx = selectRepresentativeIndex(hourlyIndices, data.hourly.time);
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
    setWeatherData,
    setForecastData,
    setLocation,
    setLoading,
    setError,
    setActiveDate,
  } = useWeatherStore();

  const intervalRef = useRef<number | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchWeatherByCoords = useCallback(async (lat: number, lon: number, options?: { targetDate?: string | null }) => {
    const targetDate = options?.targetDate ?? null;
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

      if (targetDate) {
        const snapshot = deriveWeatherSnapshot(targetDate, data);
        if (!snapshot) {
          throw new Error('No weather data for selected date');
        }
        setWeatherData(snapshot);
        setActiveDate(targetDate);
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
        });

        // Process hourly forecast (next 24 hours)
        const currentHour = new Date().getHours();
        const hourlyData: HourlyForecast[] = data.hourly.time
          .slice(currentHour, currentHour + 24)
          .map((time, i) => ({
            time: formatHour(time),
            isoTime: time,
            temperature: data.hourly.temperature_2m[currentHour + i],
            weatherCode: data.hourly.weather_code[currentHour + i],
            precipitation: data.hourly.precipitation[currentHour + i],
            humidity: data.hourly.relative_humidity_2m[currentHour + i],
            windSpeed: data.hourly.wind_speed_10m[currentHour + i],
          }));

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
  }, [setWeatherData, setForecastData, setLoading, setError]);

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
  }, [fetchWeatherByCoords, setLocation, setError]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(latitude, longitude, 'Current Location');
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
      fetchWeatherByCoords(location.lat, location.lon, { targetDate: activeDate });
    }
  }, [location, fetchWeatherByCoords, activeDate]);

  const loadDateWeather = useCallback(
    (date: string | null) => {
      if (!location) return;
      if (!date) {
        fetchWeatherByCoords(location.lat, location.lon);
      } else {
        fetchWeatherByCoords(location.lat, location.lon, { targetDate: date });
      }
    },
    [location, fetchWeatherByCoords]
  );

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (location) {
      intervalRef.current = window.setInterval(() => {
        fetchWeatherByCoords(location.lat, location.lon, { targetDate: activeDate });
      }, 5 * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [location, fetchWeatherByCoords, activeDate]);

  // Abort any in-flight request if this hook unmounts
  useEffect(() => {
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, []);

  // Initial load
  useEffect(() => {
    getCurrentLocation();
  }, []);

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
    getCurrentLocation,
    refresh,
    loadDateWeather,
  };
};
