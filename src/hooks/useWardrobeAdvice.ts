import { useState, useCallback, useRef, useEffect } from 'react';
import type { WeatherData, AtmosphericState } from '@/store/weatherStore';
import { buildWardrobePrompt } from '@/utils/wardrobePrompt';

const API_URL = import.meta.env.DEV
  ? '/freellm/api/v1/chat'
  : 'https://apifreellm.com/api/v1/chat';

const API_KEY =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_FREE_LLM_API_KEY ??
  (import.meta as { env?: Record<string, string | undefined> }).env?.API_KEY;

export interface WardrobeAdviceState {
  advice: string;
  isLoading: boolean;
  error: string | null;
  hasNewAdvice: boolean;
}

export interface UseWardrobeAdviceOptions {
  weather: WeatherData | null;
  atmosphere: AtmosphericState | null;
  locationName?: string | null;
  enabled?: boolean;
}

export interface UseWardrobeAdviceResult extends WardrobeAdviceState {
  fetchAdvice: () => Promise<void>;
  clearNewAdviceFlag: () => void;
}

const DEFAULT_MESSAGE = 'Aún no hay sugerencia disponible.';
const ERROR_MESSAGE = 'No se pudo obtener recomendación. Intenta nuevamente.';
const NO_CONTENT_MESSAGE = 'La IA respondió sin texto utilizable.';

const extractResponseText = (data: Record<string, unknown>): string | null => {
  const candidates = [
    data.response,
    data.message,
    data.output,
    (data.data as Record<string, unknown> | undefined)?.response,
    (data.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

const createWeatherSignature = (
  weather: WeatherData | null,
  locationName?: string | null
): string | null => {
  if (!weather) return null;

  return JSON.stringify({
    location: locationName ?? 'unknown',
    observation: weather.observationTime ?? weather.sunrise,
    temperature: Math.round(weather.temperature),
    weatherCode: weather.weatherCode,
    precipitation: weather.precipitation,
  });
};

export const useWardrobeAdvice = ({
  weather,
  atmosphere,
  locationName,
  enabled = true,
}: UseWardrobeAdviceOptions): UseWardrobeAdviceResult => {
  const [advice, setAdvice] = useState(DEFAULT_MESSAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNewAdvice, setHasNewAdvice] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSignatureRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchAdvice = useCallback(async () => {
    if (!weather || !atmosphere) {
      return;
    }

    if (!API_KEY) {
      setError('API key no configurada. Define VITE_FREE_LLM_API_KEY en .env');
      setAdvice(ERROR_MESSAGE);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setHasNewAdvice(false);

    const prompt = buildWardrobePrompt({ weather, atmosphere, locationName });
    const signature = createWeatherSignature(weather, locationName);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.success === false) {
        throw new Error(data.error || 'API returned success: false');
      }

      const text = extractResponseText(data);

      if (text) {
        setAdvice(text);
        setHasNewAdvice(true);
        lastSignatureRef.current = signature;
      } else {
        setAdvice(NO_CONTENT_MESSAGE);
        setError('Empty response from API');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setAdvice(ERROR_MESSAGE);
    } finally {
      if (isMountedRef.current && abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [weather, atmosphere, locationName]);

  const clearNewAdviceFlag = useCallback(() => {
    setHasNewAdvice(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !weather || !atmosphere || isLoading) return;

    const currentSignature = createWeatherSignature(weather, locationName);

    if (currentSignature && currentSignature !== lastSignatureRef.current) {
      fetchAdvice();
    }
  }, [enabled, weather, atmosphere, locationName, isLoading, fetchAdvice]);

  return {
    advice,
    isLoading,
    error,
    hasNewAdvice,
    fetchAdvice,
    clearNewAdviceFlag,
  };
};
