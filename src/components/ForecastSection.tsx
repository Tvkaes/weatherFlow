import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useWeatherStore } from '../store/weatherStore';
import type { HourlyForecast, DailyForecast } from '../store/weatherStore';
import { useWeatherSystem } from '../hooks/useWeatherSystem';
import { getWeatherIconClass } from '../utils/weatherIcon';
import './ForecastSection.css';

const HourlyCard = ({ hour, index }: { hour: HourlyForecast; index: number }) => {
  const iconMeta = getWeatherIconClass(hour.weatherCode, true);
  return (
    <motion.div
      className="forecast-card hourly-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <span className="forecast-time">{hour.time}</span>
      <span className={`forecast-icon ${iconMeta.className}`} aria-hidden />
      <span className="forecast-temp">{Math.round(hour.temperature)}°</span>
      {hour.precipitation > 0 && (
        <span className="forecast-precip">{Math.round(hour.precipitation)}mm</span>
      )}
    </motion.div>
  );
};

const DailyCard = ({
  day,
  index,
  isActive,
  onSelect,
}: {
  day: DailyForecast;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}) => {
  const iconMeta = getWeatherIconClass(day.weatherCode, true);
  return (
    <motion.div
      className={`forecast-card daily-card ${isActive ? 'is-active' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="forecast-day">{day.dayName.slice(0, 3)}</span>
      <span className={`forecast-icon ${iconMeta.className}`} aria-hidden />
      <div className="forecast-temp-pair">
        <span className="temp-max">{Math.round(day.temperatureMax)}°</span>
        <span className="temp-divider">/</span>
        <span className="temp-min">{Math.round(day.temperatureMin)}°</span>
      </div>
      {day.precipitation > 0 && (
        <span className="forecast-precip">{Math.round(day.precipitation)}mm</span>
      )}
    </motion.div>
  );
};

export const ForecastSection = () => {
  const { hourlyForecast, dailyForecast } = useWeatherStore();
  const hourlyRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { loadDateWeather, activeDate } = useWeatherSystem();

  useEffect(() => {
    if (sectionRef.current && hourlyForecast.length > 0) {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 1, ease: 'power3.out' }
      );
    }
  }, [hourlyForecast.length]);

  if (hourlyForecast.length === 0 && dailyForecast.length === 0) {
    return null;
  }

  return (
    <div ref={sectionRef} className="forecast-section">
      {hourlyForecast.length > 0 && (
        <div className="forecast-block">
          <h3 className="forecast-title">Hourly</h3>
          <div ref={hourlyRef} className="forecast-scroll hourly-scroll">
            {hourlyForecast.map((hour, i) => (
              <HourlyCard key={hour.time + i} hour={hour} index={i} />
            ))}
          </div>
        </div>
      )}

      {dailyForecast.length > 0 && (
        <div className="forecast-block">
          <h3 className="forecast-title">7-Day Forecast</h3>
          <div className="forecast-scroll daily-scroll">
            {dailyForecast.map((day, i) => (
              <DailyCard
                key={day.date}
                day={day}
                index={i}
                isActive={activeDate === day.date}
                onSelect={() =>
                  activeDate === day.date ? loadDateWeather(null) : loadDateWeather(day.date)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
