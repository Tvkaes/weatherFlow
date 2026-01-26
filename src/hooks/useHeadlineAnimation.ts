import { useEffect, useRef } from 'react';

export const useHeadlineAnimation = (windSpeed: number) => {
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!headlineRef.current) return;

    const weight = 300 + windSpeed * 400;
    const slant = -windSpeed * 12;
    headlineRef.current.style.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slant}`;
  }, [windSpeed]);

  return headlineRef;
};
