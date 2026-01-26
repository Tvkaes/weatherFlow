import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useWeatherStore } from '../store/weatherStore';

export const useAlertSystem = () => {
  const { error, setError } = useWeatherStore();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const dismissAlert = useCallback(
    (animated = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
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

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => dismissAlert(), 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [alertMessage, dismissAlert]);

  return {
    alertMessage,
    dismissAlert,
    alertRef,
  };
};
