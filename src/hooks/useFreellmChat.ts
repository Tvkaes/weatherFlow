import { useState, useCallback, useRef, useEffect } from 'react';
import { FREE_LLM_API_KEY, FREE_LLM_API_URL } from '@/config/llm';

export interface FreellmFeatures {
  unlimited: boolean;
  delaySeconds: number;
  priorityProcessing: boolean;
  [key: string]: unknown;
}

export interface FreellmResponseEnvelope {
  success: boolean;
  response: string;
  tier: string;
  features: FreellmFeatures;
  [key: string]: unknown;
}

export interface FreellmRequestPayload {
  message: string;
  conversationId?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export interface UseFreellmChatResult {
  latestResponse: FreellmResponseEnvelope | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (payload: FreellmRequestPayload) => Promise<FreellmResponseEnvelope | null>;
}

export const useFreellmChat = (): UseFreellmChatResult => {
  const [latestResponse, setLatestResponse] = useState<FreellmResponseEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (payload: FreellmRequestPayload) => {
    if (!FREE_LLM_API_KEY) {
      setError('Missing API key. Ensure VITE_FREE_LLM_API_KEY or API_KEY is defined in your .env');
      return null;
    }

    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(FREE_LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FREE_LLM_API_KEY}`,
        },
        body: JSON.stringify({
          message: payload.message,
          conversationId: payload.conversationId,
          context: payload.context,
          metadata: payload.metadata,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`FreeLLM request failed: ${response.status}`);
      }

      const data: FreellmResponseEnvelope = await response.json();
      setLatestResponse(data);
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Unexpected error requesting FreeLLM';
      setError(message);
      return null;
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => () => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
  }, []);

  return { latestResponse, isLoading, error, sendMessage };
};
