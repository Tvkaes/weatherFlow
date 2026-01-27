import { motion } from 'framer-motion';
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
}: LocationControlsProps) => (
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
          onClick={onToggleSearch}
          aria-expanded={isSearchOpen}
          aria-controls="search-panel"
        >
          <span className="location-icon" aria-hidden>
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
);
