import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
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
import { useWardrobeAdvice } from '@/hooks/useWardrobeAdvice';
import { WardrobeAdviceCard } from '@/components/WardrobeAdviceCard';

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
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const modalOverlayRef = useRef<HTMLDivElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const [isSecondaryModalOpen, setIsSecondaryModalOpen] = useState(false);

  const {
    advice: wardrobeAdvice,
    isLoading: isWardrobeLoading,
    hasNewAdvice: isWardrobeNotificationActive,
    clearNewAdviceFlag: markAdviceSeen,
  } = useWardrobeAdvice({
    weather: rawWeather,
    atmosphere,
    locationName: location?.name,
    enabled: !isLoading,
  });

  const adviceParagraphs = useMemo(() => {
    return wardrobeAdvice
      .split(/\n{2,}|\r?\n-\s*/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }, [wardrobeAdvice]);

  const handleRetry = () => {
    refresh();
    dismissAlert();
  };

  const selectedDateLabel = useMemo(() => (
    activeDate
      ? new Date(activeDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Today'
  ), [activeDate]);

  useEffect(() => {
    const indicatorEl = indicatorRef.current;
    if (!indicatorEl) return;

    gsap.killTweensOf(indicatorEl);

    if (!isWardrobeNotificationActive) {
      gsap.set(indicatorEl, { autoAlpha: 0, scale: 0.6 });
      return;
    }

    const tween = gsap.fromTo(
      indicatorEl,
      { scale: 0.75, autoAlpha: 0.65 },
      { scale: 1.15, autoAlpha: 1, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' }
    );

    return () => {
      tween.kill();
    };
  }, [isWardrobeNotificationActive]);

  
  useEffect(() => {
    if (!isSecondaryModalOpen) return;

    const overlay = modalOverlayRef.current;
    const panel = modalPanelRef.current;
    const tl = gsap.timeline({ defaults: { duration: 0.25 } });

    if (overlay) {
      gsap.set(overlay, { autoAlpha: 0 });
      tl.to(overlay, { autoAlpha: 1, ease: 'power1.out' });
    }

    if (panel) {
      gsap.set(panel, { autoAlpha: 0, y: 40 });
      tl.to(panel, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '<');
    }

    return () => {
      tl.kill();
    };
  }, [isSecondaryModalOpen]);

  const openSecondaryModal = () => {
    if (!isSecondaryModalOpen) {
      setIsSecondaryModalOpen(true);
      if (isWardrobeNotificationActive) {
        markAdviceSeen();
      }
    }
  };

  const closeSecondaryModal = () => {
    if (!isSecondaryModalOpen) return;

    const overlay = modalOverlayRef.current;
    const panel = modalPanelRef.current;

    const tl = gsap.timeline({
      onComplete: () => setIsSecondaryModalOpen(false),
    });

    if (panel) {
      tl.to(panel, { y: 40, autoAlpha: 0, duration: 0.35, ease: 'power2.in' });
    }

    if (overlay) {
      tl.to(overlay, { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, '<');
    }
  };

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

      <div className="content-grid">
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

        <section className="secondary-panel" aria-label="Asistente de estilo">
          <WardrobeAdviceCard
            adviceParagraphs={adviceParagraphs}
            adviceText={wardrobeAdvice}
            isLoading={isWardrobeLoading}
            className="secondary-panel__card"
          />
        </section>
      </div>

      <button
        type="button"
        className="secondary-panel-fab"
        aria-label="Abrir panel derecho"
        onClick={openSecondaryModal}
      >
        <span className="fab-icon" aria-hidden="true">💡</span>
        <span ref={indicatorRef} className="fab-indicator" aria-hidden="true" />
      </button>

      {isSecondaryModalOpen && (
        <div
          ref={modalOverlayRef}
          className="secondary-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Panel lateral"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSecondaryModal();
            }
          }}
        >
          <WardrobeAdviceCard
            ref={modalPanelRef}
            adviceParagraphs={adviceParagraphs}
            adviceText={wardrobeAdvice}
            isLoading={isWardrobeLoading}
            className="wardrobe-card--modal"
            showCloseButton
            onClose={closeSecondaryModal}
          />
        </div>
      )}

      <AlertStack message={alertMessage} alertRef={alertRef} onRetry={handleRetry} />

      <WeatherFooter normalized={normalized} mood={mood} />

      <LoadingOverlay isVisible={Boolean(isLoading && rawWeather)} />
    </div>
  );
};
