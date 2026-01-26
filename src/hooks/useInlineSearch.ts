import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

interface UseInlineSearchOptions {
  onSearch: (query: string) => Promise<void> | void;
}

export const useInlineSearch = ({ onSearch }: UseInlineSearchOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInlineRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAnimInitRef = useRef(false);

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

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      await onSearch(trimmed);
      setSearchQuery('');
      setIsOpen(false);
    },
    [searchQuery, onSearch]
  );

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    searchInlineRef,
    searchInputRef,
  };
};
