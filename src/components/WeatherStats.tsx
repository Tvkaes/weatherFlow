import { memo } from 'react';
import type { WeatherData } from '../store/weatherStore';
import { describeWeatherCode } from '@/utils/weatherIcon';
import { MetricBar } from './MetricBar';

interface WeatherStatsProps {
  iconClass: string;
  rawWeather: WeatherData;
  selectedDateLabel: string;
}

const formatValue = (value: number, unit: string) => `${Math.round(value)}${unit}`;

export const WeatherStats = memo(({ iconClass, rawWeather, selectedDateLabel }: WeatherStatsProps) => {
  const conditionLabel = describeWeatherCode(rawWeather.weatherCode);

  return (
    <>
      <div className="temperature-display" aria-label={`Current weather: ${conditionLabel}`}>
        <span className={`weather-icon ${iconClass}`} aria-hidden />
        <span className="visually-hidden">{conditionLabel}</span>
        <span className="temperature-value">{Math.round(rawWeather.temperature)}</span>
        <span className="temperature-unit">°C</span>
      </div>

      <div className="weather-details">
        <MetricBar label="Fecha" valueLabel={selectedDateLabel} progress={1} />
      <MetricBar
        label="Humidity"
        valueLabel={formatValue(rawWeather.humidity, '%')}
        progress={rawWeather.humidity / 100}
      />
      <MetricBar
        label="Wind"
        valueLabel={`${formatValue(rawWeather.windSpeed, '')} km/h`}
        progress={Math.min(rawWeather.windSpeed / 100, 1)}
      />
      <MetricBar
        label="Pressure"
        valueLabel={`${formatValue(rawWeather.pressure, '')} hPa`}
        progress={(rawWeather.pressure - 950) / 100}
      />
      <MetricBar
        label="Cloud Cover"
        valueLabel={formatValue(rawWeather.cloudCover, '%')}
        progress={rawWeather.cloudCover / 100}
      />
      </div>
    </>
  );
});

WeatherStats.displayName = 'WeatherStats';
