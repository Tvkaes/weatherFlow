import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeatherStore } from '../store/weatherStore';
import { useWeatherSystem } from '../hooks/useWeatherSystem';
import { ForecastSection } from './ForecastSection';
import { getWeatherIconClass } from '../utils/weatherIcon';
import { useInlineSearch } from '../hooks/useInlineSearch';
import './WeatherUI.css';
import { useAlertSystem } from '../hooks/useAlertSystem';
import { useHeadlineAnimation } from '../hooks/useHeadlineAnimation';
import { usePortalReveal } from '../hooks/usePortalReveal';
import { AnimatedHeadline } from './AnimatedHeadline';
import { LoadingPortal } from './LoadingPortal';
import { WeatherAlerts } from './WeatherAlerts';
import { WeatherStats } from './WeatherStats';

export const WeatherUI = () => {
  const { rawWeather, normalized, atmosphere, location, isLoading, headline, mood, activeDate } = useWeatherStore();
  const { searchLocation, refresh } = useWeatherSystem();
  const {
    isOpen: isSearchOpen,
    setIsOpen: setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    searchInlineRef,
    searchInputRef,
  } = useInlineSearch({ onSearch: searchLocation });
  const { alertMessage, dismissAlert, alertRef } = useAlertSystem();
  const portalOpen = usePortalReveal(rawWeather, isLoading);
  const headlineRef = useHeadlineAnimation(normalized.windSpeed);

  const handleRetry = () => {
    refresh();
    dismissAlert();
  };

  const selectedDateLabel = useMemo(() => (
    activeDate
      ? new Date(activeDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Hoy'
  ), [activeDate]);

  if (isLoading && !rawWeather) {
    return (
      <div className="loading-container">
        <LoadingPortal />
        <motion.div
          className="loading-orb"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.p
          className="loading-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Entering the atmospheric portal...
        </motion.p>
      </div>
    );
  }

  if (!rawWeather) return null;

  const iconMeta = getWeatherIconClass(rawWeather.weatherCode, rawWeather.isDay);
  const kelvinDisplay = Math.round(atmosphere.colorTemperature.temperature);

  return (
    <div className="weather-ui" data-mood={mood}>
      <div className={`portal-overlay ${portalOpen ? 'portal-overlay--open' : ''}`}>
        <div className="portal-rim" />
      </div>
      <motion.header 
        className="header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="location-cluster">
          <div className="location-info">
            <button 
              className="search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-expanded={isSearchOpen}
            >
              <span className="location-icon">◎</span>
              <span className="location-name">{location?.name || 'Unknown'}</span>
            </button>
          </div>

          <div ref={searchInlineRef} className="search-inline" aria-hidden={!isSearchOpen}>
            <form className="search-form search-form--inline" onSubmit={handleSearch}>
              <span className="search-input-icon">⌕</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar una ciudad, estado o país"
                className="search-input"
              />
            </form>
          </div>

          <button className="refresh-btn" onClick={refresh} disabled={isLoading}>
            <motion.span
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
            >
              ↻
            </motion.span>
          </button>
        </div>
      </motion.header>

      <main className="main-content">
        <div className="weather-card">
          <AnimatedHeadline ref={headlineRef} text={headline} />

          <WeatherStats
            iconClass={iconMeta.className}
            rawWeather={rawWeather}
            selectedDateLabel={selectedDateLabel}
          />
        </div>

        <motion.div 
          className="atmospheric-data"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div className="atmo-item">
            <span className="atmo-label">Color Temp</span>
            <span className="atmo-value">{kelvinDisplay}K</span>
          </div>
          <div className="atmo-item">
            <span className="atmo-label">Condition</span>
            <span className="atmo-value">{atmosphere.weatherCondition}</span>
          </div>
          <div className="atmo-item">
            <span className="atmo-label">Phase</span>
            <span className="atmo-value">{atmosphere.timePhase}</span>
          </div>
        </motion.div>

        <ForecastSection />
      </main>

      <div className="alert-stack" aria-live="polite">
        <WeatherAlerts message={alertMessage} alertRef={alertRef} onRetry={handleRetry} />
      </div>

      <footer className="footer">
        <span className="time-indicator">
          {normalized.goldenHour > 0.3 && '✦ Golden Hour'}
          {normalized.blueHour > 0.3 && '✧ Blue Hour'}
          {normalized.goldenHour <= 0.3 && normalized.blueHour <= 0.3 && (
            normalized.timeOfDay > 0.25 && normalized.timeOfDay < 0.75 ? '○ Day' : '● Night'
          )}
        </span>
        <span className="footer-credit">Powered by Open-Meteo API · Tvkaes · WeatherFlow</span>
        <span className="mood-indicator">Mood: {mood}</span>
      </footer>

      {isLoading && rawWeather && (
        <motion.div 
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="loading-overlay__spinner" />
          <span>Actualizando clima...</span>
        </motion.div>
      )}
    </div>
  );
};
