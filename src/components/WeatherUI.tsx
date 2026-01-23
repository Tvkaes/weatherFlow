import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useWeatherStore } from '../store/weatherStore';
import { useWeatherSystem } from '../hooks/useWeatherSystem';
import { ForecastSection } from './ForecastSection';
import { getWeatherIconClass } from '../utils/weatherIcon';
import './WeatherUI.css';

const LoadingPortal = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const layers = gsap.utils.toArray<HTMLDivElement>('.portal-tunnel-layer');
      layers.forEach((layer, idx) => {
        const baseScale = 1 - idx * 0.08;
        gsap.fromTo(
          layer,
          { scale: baseScale, opacity: 0 },
          {
            scale: baseScale * 0.7,
            opacity: 0.35 - idx * 0.08,
            duration: 4 + idx,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }
        );

        gsap.to(layer, {
          rotation: idx % 2 === 0 ? 360 : -360,
          duration: 12 - idx * 2,
          repeat: -1,
          ease: 'none',
        });
      });

      gsap.fromTo(
        '.portal-core',
        { scale: 0.85, opacity: 0.6 },
        {
          scale: 1.05,
          opacity: 1,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="loading-portal">
      <div className="portal-tunnel-layer layer-one" />
      <div className="portal-tunnel-layer layer-two" />
      <div className="portal-tunnel-layer layer-three" />
      <div className="portal-core" />
    </div>
  );
};

export const WeatherUI = () => {
  const { rawWeather, normalized, atmosphere, location, isLoading, headline, mood, error, setError } = useWeatherStore();
  const { searchLocation, refresh } = useWeatherSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const temperatureRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const searchInlineRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAnimInitRef = useRef(false);
  const alertTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const dismissAlert = useCallback(
    (animated = true) => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }

      const finalize = () => {
        setAlertMessage(null);
        setError(null);
      };

      if (animated && alertRef.current) {
        gsap.to(alertRef.current, {
          x: 40,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power3.in',
          onComplete: finalize,
        });
      } else {
        finalize();
      }
    },
    [setError]
  );

  const handleRetry = () => {
    refresh();
    dismissAlert();
  };

  useEffect(() => {
    if (error) {
      setAlertMessage(error);
    }
  }, [error]);

  useEffect(() => {
    if (!alertMessage || !alertRef.current) return;

    const el = alertRef.current;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { x: 40, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }
    );

    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }

    alertTimeoutRef.current = window.setTimeout(() => dismissAlert(), 2000);

    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [alertMessage, dismissAlert]);

  // GSAP entrance animation
  useEffect(() => {
    if (containerRef.current && !isLoading && rawWeather) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.weather-card',
          { y: 100, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' }
        );

        gsap.fromTo(
          '.headline-text',
          { y: 50, opacity: 0, filter: 'blur(10px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, delay: 0.3, ease: 'power3.out' }
        );

        gsap.fromTo(
          '.temperature-display',
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, delay: 0.5, ease: 'back.out(1.7)' }
        );

        gsap.fromTo(
          '.weather-detail',
          { x: -30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.7, ease: 'power2.out' }
        );
      }, containerRef);

      return () => ctx.revert();
    }
  }, [isLoading, rawWeather]);

  // Variable font animation based on wind
  useEffect(() => {
    if (headlineRef.current) {
      const weight = 300 + normalized.windSpeed * 400;
      const slant = -normalized.windSpeed * 12;
      headlineRef.current.style.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slant}`;
    }
  }, [normalized.windSpeed]);

  // Animate inline search bar beside badge
  useEffect(() => {
    const wrapper = searchInlineRef.current;
    if (!wrapper) return;

    if (!searchAnimInitRef.current) {
      gsap.set(wrapper, { width: 0, opacity: 0 });
      searchAnimInitRef.current = true;
    }

    gsap.killTweensOf(wrapper);

    if (isSearchOpen) {
      const targetWidth = wrapper.scrollWidth;
      wrapper.classList.add('search-inline--active');
      gsap.fromTo(
        wrapper,
        { width: 0, opacity: 0 },
        {
          width: targetWidth,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          onUpdate: () => gsap.set(wrapper, { pointerEvents: 'auto' }),
          onComplete: () => {
            wrapper.style.width = 'auto';
            gsap.set(wrapper, { pointerEvents: 'auto' });
          },
        }
      );
      searchInputRef.current?.focus();
    } else {
      const currentWidth = wrapper.offsetWidth || wrapper.scrollWidth;
      gsap.fromTo(
        wrapper,
        { width: currentWidth, opacity: 1 },
        {
          width: 0,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => {
            wrapper.classList.remove('search-inline--active');
            wrapper.style.width = '0px';
            gsap.set(wrapper, { pointerEvents: 'none' });
          },
        }
      );
      searchInputRef.current?.blur();
    }
  }, [isSearchOpen]);

  // Portal reveal once we have weather data
  useEffect(() => {
    if (rawWeather && !portalOpen) {
      const timeout = setTimeout(() => setPortalOpen(true), 200);
      return () => clearTimeout(timeout);
    }
  }, [rawWeather, portalOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchLocation(searchQuery);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

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
    <div ref={containerRef} className="weather-ui" data-mood={mood}>
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
          <h1 ref={headlineRef} className="headline-text">
            {headline}
          </h1>

          <div className="temperature-display">
            <span className={`weather-icon ${iconMeta.className}`} aria-hidden />
            <span ref={temperatureRef} className="temperature-value">
              {Math.round(rawWeather.temperature)}
            </span>
            <span className="temperature-unit">°C</span>
          </div>

          <div className="weather-details">
            <div className="weather-detail">
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{rawWeather.humidity}%</span>
              <div className="detail-bar">
                <motion.div
                  className="detail-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rawWeather.humidity}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="weather-detail">
              <span className="detail-label">Wind</span>
              <span className="detail-value">{Math.round(rawWeather.windSpeed)} km/h</span>
              <div className="detail-bar">
                <motion.div
                  className="detail-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, rawWeather.windSpeed)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="weather-detail">
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{Math.round(rawWeather.pressure)} hPa</span>
              <div className="detail-bar">
                <motion.div
                  className="detail-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${((rawWeather.pressure - 950) / 100) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="weather-detail">
              <span className="detail-label">Cloud Cover</span>
              <span className="detail-value">{rawWeather.cloudCover}%</span>
              <div className="detail-bar">
                <motion.div
                  className="detail-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rawWeather.cloudCover}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
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
        {alertMessage && (
          <div className="alert-card" ref={alertRef}>
            <div>
              <p className="alert-title">Location not found</p>
              <p className="alert-message">{alertMessage}</p>
            </div>
            <button onClick={handleRetry}>Retry</button>
          </div>
        )}
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
