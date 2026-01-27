import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { fetchGeocodingSuggestions } from '../utils/geocoding';

interface UseInlineSearchOptions {
  onSearch: (query: string) => Promise<void> | void;
  onSelectSuggestion: (payload: {
    latitude: number;
    longitude: number;
    label: string;
    country?: string;
    admin1?: string;
  }) => Promise<void> | void;
}

const DEBOUNCE_MS = 200;

export type InlineSuggestion = {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  population?: number;
  city?: string;
};

const formatPopulation = (population?: number) => {
  if (!population) return undefined;
  if (population >= 1_000_000) {
    return `${(population / 1_000_000).toFixed(1)}M`;
  }
  if (population >= 1_000) {
    return `${Math.round(population / 1_000)}k`;
  }
  return String(population);
};

export const useInlineSearch = ({ onSearch, onSelectSuggestion }: UseInlineSearchOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const searchInlineRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);
  const searchAnimInitRef = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const wrapper = searchInlineRef.current;
    if (!wrapper) return;

    if (!searchAnimInitRef.current) {
      gsap.set(wrapper, { width: 0, opacity: 0 });
      searchAnimInitRef.current = true;
    }

    gsap.killTweensOf(wrapper);

    if (isOpen) {
      const targetWidth = wrapper.scrollWidth || 240;
      wrapper.classList.add('search-inline--active');
      gsap.fromTo(
        wrapper,
        { width: 0, opacity: 0 },
        {
          width: targetWidth,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          onUpdate: () => {
            gsap.set(wrapper, { pointerEvents: 'auto' });
          },
          onComplete: () => {
            wrapper.style.width = 'auto';
            gsap.set(wrapper, { pointerEvents: 'auto' });
            searchInputRef.current?.focus();
          },
        }
      );
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
            searchInputRef.current?.blur();
          },
        }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setActiveIndex(-1);
      if (suggestionsAbortRef.current) {
        suggestionsAbortRef.current.abort();
        suggestionsAbortRef.current = null;
      }
      return;
    }

    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      if (suggestionsAbortRef.current) {
        suggestionsAbortRef.current.abort();
      }
      const controller = new AbortController();
      suggestionsAbortRef.current = controller;
      setIsFetchingSuggestions(true);
      try {
        const geoSuggestions = await fetchGeocodingSuggestions(searchQuery, {
          limit: 6,
          signal: controller.signal,
        });
        const nextSuggestions = geoSuggestions.map((suggestion) => ({
          id: suggestion.id,
          primary: suggestion.city ?? suggestion.label,
          secondary: [suggestion.admin1, suggestion.country].filter(Boolean).join(', '),
          badge: formatPopulation(suggestion.population),
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          country: suggestion.country,
          admin1: suggestion.admin1,
          population: suggestion.population,
          city: suggestion.city ?? suggestion.label,
        }));
        setSuggestions(nextSuggestions);
        setActiveIndex(nextSuggestions.length ? 0 : -1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      } finally {
        if (suggestionsAbortRef.current === controller) {
          suggestionsAbortRef.current = null;
        }
        setIsFetchingSuggestions(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setActiveIndex(-1);
  }, []);

  const selectSuggestion = useCallback(async (suggestion: InlineSuggestion) => {
    try {
      await onSelectSuggestion({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        label: [suggestion.primary, suggestion.secondary].filter(Boolean).join(', '),
        country: suggestion.country,
        admin1: suggestion.admin1,
      });
    } finally {
      setSearchQuery('');
      clearSuggestions();
      setIsOpen(false);
    }
  }, [onSelectSuggestion, clearSuggestions]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      await onSearch(trimmed);
      setSearchQuery('');
      clearSuggestions();
      setIsOpen(false);
    },
    [searchQuery, onSearch, clearSuggestions]
  );

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        const suggestion = suggestions[activeIndex];
        await selectSuggestion(suggestion);
      }
    },
    [suggestions, activeIndex, selectSuggestion]
  );

  useEffect(() => {
    return () => {
      if (suggestionsAbortRef.current) {
        suggestionsAbortRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    handleKeyDown,
    suggestions,
    isFetchingSuggestions,
    activeIndex,
    clearSuggestions,
    selectSuggestion,
    searchInlineRef,
    searchInputRef,
  };
};
