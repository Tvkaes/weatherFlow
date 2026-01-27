import type { NormalizedWeather } from '@/store/weatherStore';

interface WeatherFooterProps {
  normalized: NormalizedWeather;
  mood: string;
}

const getLightIndicator = (normalized: NormalizedWeather) => {
  if (normalized.goldenHour > 0.3) return '✦ Golden Hour';
  if (normalized.blueHour > 0.3) return '✧ Blue Hour';
  if (normalized.timeOfDay > 0.25 && normalized.timeOfDay < 0.75) return '○ Day';
  return '● Night';
};

export const WeatherFooter = ({ normalized, mood }: WeatherFooterProps) => {
  const indicator = getLightIndicator(normalized);

  return (
    <footer className="footer" role="contentinfo">
      <div className="time-indicator" aria-label="Light condition indicator">
        {indicator}
      </div>
      <p className="footer-credit">Powered by Open-Meteo API · Tvkaes · WeatherFlow</p>
      <p className="mood-indicator" aria-live="polite">
        Mood: {mood}
      </p>
    </footer>
  );
};
