import { useMemo } from 'react';
import type { WeatherData } from '@/store/weatherStore';

export type ComfortLevel =
  | 'frigid'
  | 'cold'
  | 'cool'
  | 'comfortable'
  | 'warm'
  | 'oppressive';

export interface ComfortDriver {
  label: string;
  detail: string;
}

export interface ComfortIndexData {
  isAvailable: boolean;
  level: ComfortLevel;
  levelLabel: string;
  summary: string;
  feelsLikeC: number | null;
  score: number; // 0 uncomfortable -> 1 ideal
  recommendations: string[];
  drivers: ComfortDriver[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const selectRecommendations = (level: ComfortLevel, humidity: number | null) => {
  switch (level) {
    case 'frigid':
      return ['Layer thermal fabrics', 'Protect ears and hands', 'Limit outdoor exposure'];
    case 'cold':
      return ['Add an insulating mid-layer', 'Cover head and neck'];
    case 'cool':
      return ['Carry a light jacket', 'Use breathable but wind-blocking fabrics'];
    case 'warm':
      return humidity && humidity > 65
        ? ['Prefer moisture-wicking fabrics', 'Stay hydrated frequently']
        : ['Choose breathable cotton or linen', 'Keep water handy'];
    case 'oppressive':
      return ['Avoid strenuous activity outdoors', 'Seek shade and hydrate continually'];
    default:
      return ['Conditions feel balanced', 'Stay hydrated and enjoy the day'];
  }
};

const describeLevel = (level: ComfortLevel, humidity: number | null): string => {
  switch (level) {
    case 'frigid':
      return 'Biting cold and heightened frost risk.';
    case 'cold':
      return 'Chilly air that cools the skin quickly.';
    case 'cool':
      return 'Fresh breeze; light layers keep you comfortable.';
    case 'warm':
      return humidity && humidity > 65
        ? 'Warm and muggy—heat sticks to the skin.'
        : 'Warm sunshine with a mild edge.';
    case 'oppressive':
      return humidity && humidity > 65
        ? 'Heavy, humid air slows heat relief.'
        : 'Intense heat; body struggles to cool down.';
    default:
      return 'Balanced air with minimal thermal stress.';
  }
};

const classifyLevel = (apparentC: number | null, humidity: number | null): ComfortLevel => {
  if (apparentC === null) return 'comfortable';

  if (apparentC <= -5) return 'frigid';
  if (apparentC <= 8) return 'cold';
  if (apparentC <= 17) return 'cool';
  if (apparentC <= 27) return 'comfortable';
  if (apparentC <= 32) {
    return humidity && humidity > 70 ? 'oppressive' : 'warm';
  }
  return 'oppressive';
};

const computeHeatIndex = (tempC: number, humidity: number) => {
  // Simple Steadman's approximation converted to Celsius
  const tempF = tempC * 9/5 + 32;
  const hiF = -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity;

  return (hiF - 32) * 5/9;
};

const computeWindChill = (tempC: number, windKph: number) => {
  const windMph = windKph / 1.609;
  const tempF = tempC * 9/5 + 32;
  const wcF = 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16);
  return (wcF - 32) * 5/9;
};

export const useComfortIndex = (weather: WeatherData | null): ComfortIndexData => {
  return useMemo(() => {
    if (!weather) {
      return {
        isAvailable: false,
        level: 'comfortable',
        levelLabel: 'Comfort unavailable',
        summary: 'No weather data to estimate comfort.',
        feelsLikeC: null,
        score: 0.5,
        recommendations: ['Check back once data loads'],
        drivers: [{ label: 'Thermal load', detail: 'Waiting for live observations.' }],
      };
    }

    const { temperature, humidity, windSpeed } = weather;
    let feelsLike = temperature;

    if (temperature >= 27 && humidity >= 40) {
      feelsLike = computeHeatIndex(temperature, humidity);
    } else if (temperature <= 10 && windSpeed >= 8) {
      feelsLike = computeWindChill(temperature, windSpeed);
    }

    const level = classifyLevel(feelsLike, humidity);
    const summary = describeLevel(level, humidity);
    const recommendations = selectRecommendations(level, humidity);

    const tempPenalty = Math.abs(feelsLike - 22) / 22;
    const humidityPenalty = humidity != null ? Math.max(0, (humidity - 60) / 50) : 0;
    const windPenalty = windSpeed ? Math.max(0, (windSpeed - 25) / 40) : 0;
    const rawScore = 1 - (tempPenalty * 0.6 + humidityPenalty * 0.25 + windPenalty * 0.15);
    const score = clamp(rawScore, 0, 1);

    const levelLabels: Record<ComfortLevel, string> = {
      frigid: 'Biting cold',
      cold: 'Chilly',
      cool: 'Cool & breezy',
      comfortable: 'Comfortable',
      warm: 'Warm',
      oppressive: 'Oppressive heat',
    };

    const thermalLoad = (() => {
      const delta = feelsLike - 22;
      if (delta <= -10) return 'Air pulls heat rapidly—limit exposure.';
      if (delta <= -4) return 'Noticeable chill without proper layers.';
      if (delta <= 4) return 'Close to ideal metabolic range.';
      if (delta <= 8) return 'Body warms faster, seek shade periodically.';
      return 'High heat load—cool-down breaks are essential.';
    })();

    const humidityImpact = (() => {
      if (humidity == null) return 'Humidity signal unavailable.';
      if (humidity >= 80) return 'Moist air blocks sweat evaporation.';
      if (humidity >= 60) return 'Humidity slightly slows cooling.';
      if (humidity >= 35) return 'Moisture balance feels neutral.';
      return 'Dry air accelerates skin dehydration.';
    })();

    const windRelief = (() => {
      if (windSpeed == null) return 'Calm wind data missing.';
      if (windSpeed >= 35) return 'Strong gusts amplify cooling sharply.';
      if (windSpeed >= 18) return 'Steady breeze helps vent excess heat.';
      if (windSpeed >= 8) return 'Light breeze offers mild relief.';
      return 'Still air can feel stagnant.';
    })();

    return {
      isAvailable: true,
      level,
      levelLabel: levelLabels[level],
      summary,
      feelsLikeC: Math.round(feelsLike * 10) / 10,
      score,
      recommendations,
      drivers: [
        { label: 'Thermal load', detail: thermalLoad },
        { label: 'Humidity effect', detail: humidityImpact },
        { label: 'Wind relief', detail: windRelief },
      ],
    };
  }, [weather]);
};
