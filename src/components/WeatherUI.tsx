import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeatherStore } from '@/store/weatherStore';
import { useWeatherSystem } from '@/hooks/useWeatherSystem';
import { ForecastSection } from '@/components/ForecastSection';
import { getWeatherIconClass } from '@/utils/weatherIcon';
import { useInlineSearch } from '@/hooks/useInlineSearch';
import '@/components/WeatherUI.css';
import { useAlertSystem } from '@/hooks/useAlertSystem';
import { useHeadlineAnimation } from '@/hooks/useHeadlineAnimation';
import { usePortalReveal } from '@/hooks/usePortalReveal';
import { AnimatedHeadline } from '@/components/AnimatedHeadline';
import { WeatherAlerts } from '@/components/WeatherAlerts';
import { WeatherStats } from '@/components/WeatherStats';

export const WeatherUI = () => {
  const { rawWeather, normalized, atmosphere, location, isLoading, headline, mood, activeDate } = useWeatherStore();
  const { searchLocation, searchLocationByCoords, refresh } = useWeatherSystem();
  const {
    isOpen: isSearchOpen,
    setIsOpen: setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    handleKeyDown,
    suggestions,
    isFetchingSuggestions,
    activeIndex,
    selectSuggestion,
    searchInlineRef,
    searchInputRef,
  } = useInlineSearch({
    onSearch: searchLocation,
    onSelectSuggestion: async (suggestion) => {
      await searchLocationByCoords(
        suggestion.latitude,
        suggestion.longitude,
        suggestion.label
      );
    },
  });
  const { alertMessage, dismissAlert, alertRef } = useAlertSystem();
  const portalOpen = usePortalReveal(rawWeather, isLoading);
  const headlineRef = useHeadlineAnimation(normalized.windSpeed);

  const handleRetry = () => {
    refresh();
    dismissAlert();
  };

  const selectedDateLabel = useMemo(() => (
    activeDate
      ? new Date(activeDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Today'
  ), [activeDate]);

  if (isLoading && !rawWeather) {
    return (
      <div className="loading-container loading-container--basic">
        <motion.div
          className="loading-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
        <motion.p
          className="loading-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        >
          Calibrating weather...
        </motion.p>
      </div>
    );
  }

  if (!rawWeather) return null;

  const iconMeta = getWeatherIconClass(rawWeather.weatherCode, rawWeather.isDay);
  const kelvinDisplay = Math.round(atmosphere.colorTemperature.temperature);

  const formatPopulation = (population?: number) => {
    if (!population) return null;
    if (population >= 1_000_000) {
      return `${(population / 1_000_000).toFixed(1)}M`;
    }
    if (population >= 1_000) {
      return `${Math.round(population / 1_000)}k`;
    }
    return String(population);
  };

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
        role="banner"
      >
        <nav className="location-cluster" aria-label="Location controls">
          <div className="location-info">
            <button 
              className="search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-expanded={isSearchOpen}
              aria-controls="search-panel"
            >
              <span className="location-icon" aria-hidden>◎</span>
              <span className="location-name">{location?.name || 'Unknown location'}</span>
              <span className="visually-hidden">Toggle location search</span>
            </button>
          </div>

          <section
            id="search-panel"
            ref={searchInlineRef}
            className="search-inline"
            aria-hidden={!isSearchOpen}
            aria-label="Inline location search"
          >
            <form className="search-form search-form--inline" onSubmit={handleSearch} role="search">
              <span className="search-input-icon" aria-hidden>⌕</span>
              <label htmlFor="location-search" className="visually-hidden">
                Search for a city, state or country
              </label>
              <input
                ref={searchInputRef}
                id="location-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for a city, state or country"
                className="search-input"
                aria-autocomplete="list"
                aria-expanded={isSearchOpen && suggestions.length > 0}
                aria-controls="search-suggestions"
                aria-activedescendant={
                  activeIndex >= 0 && suggestions[activeIndex]
                    ? `search-suggestion-${suggestions[activeIndex].id}`
                    : undefined
                }
              />
            </form>
            {isSearchOpen && (suggestions.length > 0 || isFetchingSuggestions) && (
              <ul id="search-suggestions" className="search-suggestions" role="listbox">
                {isFetchingSuggestions && suggestions.length === 0 && (
                  <li className="search-suggestions__loading">Searching...</li>
                )}
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`search-suggestion-${suggestion.id}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`search-suggestions__item ${activeIndex === index ? 'search-suggestions__item--active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                  >
                    <span className="search-suggestions__primary">{suggestion.city}</span>
                    <span className="search-suggestions__meta">
                      {[suggestion.admin1, suggestion.country].filter(Boolean).join(', ')}
                    </span>
                    {formatPopulation(suggestion.population) && (
                      <span className="search-suggestions__badge" aria-hidden>
                        {formatPopulation(suggestion.population)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button className="refresh-btn" onClick={refresh} disabled={isLoading} aria-label="Refresh weather data">
            <motion.span
              className="refresh-icon"
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
              aria-hidden
            >
              ↻
            </motion.span>
          </button>
        </nav>
      </motion.header>

      <main id="weather-main" className="main-content" role="main">
        <section className="weather-card" aria-labelledby="current-conditions-heading">
          <AnimatedHeadline ref={headlineRef} text={headline} />
          <h2 id="current-conditions-heading" className="visually-hidden">
            Current atmospheric snapshot
          </h2>

          <WeatherStats
            iconClass={iconMeta.className}
            rawWeather={rawWeather}
            selectedDateLabel={selectedDateLabel}
          />
        </section>

        <motion.section 
          className="atmospheric-data"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          aria-label="Atmospheric data overview"
        >
          <div className="atmo-item">
            <span className="atmo-label">Color Temp</span>
            <span className="atmo-value" aria-label={`Color temperature ${kelvinDisplay} Kelvin`}>
              {kelvinDisplay}K
            </span>
          </div>
          <div className="atmo-item">
            <span className="atmo-label">Condition</span>
            <span className="atmo-value">{atmosphere.weatherCondition}</span>
          </div>
          <div className="atmo-item">
            <span className="atmo-label">Phase</span>
            <span className="atmo-value">{atmosphere.timePhase}</span>
          </div>
        </motion.section>

        <section aria-labelledby="forecast-heading">
          <h2 id="forecast-heading" className="section-heading">
            Forecast insight
          </h2>
          <ForecastSection />
        </section>
      </main>

      <section className="alert-stack" aria-live="polite" aria-label="Weather alerts">
        <WeatherAlerts message={alertMessage} alertRef={alertRef} onRetry={handleRetry} />
      </section>

      <footer className="footer" role="contentinfo">
        <div className="time-indicator" aria-label="Light condition indicator">
          {normalized.goldenHour > 0.3 && '✦ Golden Hour'}
          {normalized.blueHour > 0.3 && '✧ Blue Hour'}
          {normalized.goldenHour <= 0.3 && normalized.blueHour <= 0.3 && (
            normalized.timeOfDay > 0.25 && normalized.timeOfDay < 0.75 ? '○ Day' : '● Night'
          )}
        </div>
        <p className="footer-credit">Powered by Open-Meteo API · Tvkaes · WeatherFlow</p>
        <p className="mood-indicator" aria-live="polite">Mood: {mood}</p>
      </footer>

      {isLoading && rawWeather && (
        <motion.div 
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="loading-overlay__spinner" />
          <span>Updating weather...</span>
        </motion.div>
      )}
    </div>
  );
};
