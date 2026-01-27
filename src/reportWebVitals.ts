import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals/attribution';

type ReportHandler = (metric: Metric) => void;

const sendMetric = (metric: Metric) => {
  const body = JSON.stringify(metric);
  const endpoint = import.meta.env.VITE_VITALS_ENDPOINT;

  if (!endpoint) {
    if (import.meta.env.DEV) {
      console.info(`[Web Vital] ${metric.name}`, metric);
    }
    return;
  }

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      /* noop */
    });
  }
};

export const reportWebVitals = (onReport?: ReportHandler) => {
  const handler = onReport ?? sendMetric;

  onCLS(handler);
  onLCP(handler);
  onINP(handler);
  onTTFB(handler);
};
