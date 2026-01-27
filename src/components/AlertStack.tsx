import type { RefObject } from 'react';
import { WeatherAlerts } from '@/components/WeatherAlerts';

interface AlertStackProps {
  message: string | null;
  alertRef: RefObject<HTMLDivElement | null>;
  onRetry: () => void;
}

export const AlertStack = ({ message, alertRef, onRetry }: AlertStackProps) => (
  <section className="alert-stack" aria-live="polite" aria-label="Weather alerts">
    <WeatherAlerts message={message} alertRef={alertRef} onRetry={onRetry} />
  </section>
);
