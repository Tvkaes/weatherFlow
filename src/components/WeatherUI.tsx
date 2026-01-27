import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeatherStore } from '@/store/weatherStore';
import { useWeatherSystem } from '@/hooks/useWeatherSystem';
import { getWeatherIconClass } from '@/utils/weatherIcon';
import { useInlineSearch } from '@/hooks/useInlineSearch';
import '@/components/WeatherUI.css';
import { useAlertSystem } from '@/hooks/useAlertSystem';
import { useHeadlineAnimation } from '@/hooks/useHeadlineAnimation';
import { usePortalReveal } from '@/hooks/usePortalReveal';
import { AnimatedHeadline } from '@/components/AnimatedHeadline';
import { WeatherStats } from '@/components/WeatherStats';
import { WeatherFooter } from '@/components/WeatherFooter';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LocationControls } from '@/components/LocationControls';
import { AtmosphericSummary } from '@/components/AtmosphericSummary';
import { AlertStack } from '@/components/AlertStack';
import { ForecastPanel } from '@/components/ForecastPanel';

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

  return (
    <div className="weather-ui" data-mood={mood}>
      <div className={`portal-overlay ${portalOpen ? 'portal-overlay--open' : ''}`}>
        <div className="portal-rim" />
      </div>
      <LocationControls
        locationName={location?.name}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        searchInlineRef={searchInlineRef}
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        handleSearch={handleSearch}
        handleKeyDown={handleKeyDown}
        suggestions={suggestions}
        isFetchingSuggestions={isFetchingSuggestions}
        activeIndex={activeIndex}
        selectSuggestion={selectSuggestion}
        refresh={refresh}
        isLoading={isLoading}
      />

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

        <AtmosphericSummary kelvinDisplay={kelvinDisplay} atmosphere={atmosphere} />

        <ForecastPanel />
      </main>

      <AlertStack message={alertMessage} alertRef={alertRef} onRetry={handleRetry} />

      <WeatherFooter normalized={normalized} mood={mood} />

      <LoadingOverlay isVisible={Boolean(isLoading && rawWeather)} />
    </div>
  );
};
