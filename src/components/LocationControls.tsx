import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FormEvent, KeyboardEvent, RefObject } from 'react';
import type { InlineSuggestion } from '@/hooks/useInlineSearch';

interface LocationControlsProps {
  locationName?: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchInlineRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  handleSearch: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  suggestions: InlineSuggestion[];
  isFetchingSuggestions: boolean;
  activeIndex: number;
  selectSuggestion: (suggestion: InlineSuggestion) => Promise<void> | void;
  refresh: () => void;
  isLoading: boolean;
}

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

export const LocationControls = ({
  locationName,
  isSearchOpen,
  onToggleSearch,
  searchInlineRef,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  handleSearch,
  handleKeyDown,
  suggestions,
  isFetchingSuggestions,
  activeIndex,
  selectSuggestion,
  refresh,
  isLoading,
}: LocationControlsProps) => {
  const locationIconRef = useRef<HTMLSpanElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const refreshIconRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const icon = locationIconRef.current;
    if (!icon) return;

    const tl = gsap.timeline({ repeat: -1 });

    tl.to(icon, {
      color: '#ff5b5b',
      textShadow: '0 0 10px rgba(255, 91, 91, 0.8)',
      duration: 0.8,
      ease: 'sine.inOut',
    })
      .to(
        icon,
        {
          scale: 1.2,
          duration: 0.35,
          yoyo: true,
          repeat: 3,
          ease: 'sine.inOut',
        },
        '<'
      )
      .to(icon, {
        y: -10,
        duration: 0.3,
        yoyo: true,
        repeat: 4,
        ease: 'power1.inOut',
      })
      .to(icon, {
        color: '',
        textShadow: 'none',
        scale: 1,
        y: 0,
        duration: 0.25,
        ease: 'power1.out',
      })
      .to({}, { duration: 55 });

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { y: -50, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    const icon = refreshIconRef.current;
    if (!icon) return;

    if (isLoading) {
      gsap.to(icon, { rotation: '+=360', duration: 1, ease: 'linear', repeat: -1 });
    } else {
      gsap.killTweensOf(icon);
      gsap.to(icon, { rotation: 0, duration: 0.3, ease: 'power1.out' });
    }

    return () => {
      gsap.killTweensOf(icon);
    };
  }, [isLoading]);

  return (
    <header ref={headerRef} className="header" role="banner">
      <nav className="location-cluster" aria-label="Location controls">
        <div className="location-info">
          <button
            className="search-toggle"
            onClick={onToggleSearch}
            aria-expanded={isSearchOpen}
            aria-controls="search-panel"
          >
            <span ref={locationIconRef} className="location-icon" aria-hidden>
              ◎
            </span>
            <span className="location-name">{locationName || 'Unknown location'}</span>
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
            <span className="search-input-icon" aria-hidden>
              ⌕
            </span>
            <label htmlFor="location-search" className="visually-hidden">
              Search for a city, state or country
            </label>
            <input
              ref={searchInputRef}
              id="location-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
                  className={`search-suggestions__item ${
                    activeIndex === index ? 'search-suggestions__item--active' : ''
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
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

        <button
          className="refresh-btn"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Refresh weather data"
        >
          <span ref={refreshIconRef} className="refresh-icon" aria-hidden>
            ↻
          </span>
        </button>
      </nav>
    </header>
  );
}
