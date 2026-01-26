import { create } from 'zustand';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  cloudCover: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  observationTime?: string;
}

export interface HourlyForecast {
  time: string;
  isoTime: string;
  temperature: number;
  weatherCode: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  isDay?: boolean;
  observationTime?: string;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  precipitation: number;
  sunrise: string;
  sunset: string;
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
export type TimePhase = 'night' | 'dawn' | 'day' | 'evening';

export interface NormalizedWeather {
  temperature: number;      // 0-1 (-20°C to 45°C mapped)
  humidity: number;         // 0-1 (0-100% mapped)
  windSpeed: number;        // 0-1 (0-100 km/h mapped)
  windDirection: number;    // 0-1 (0-360° mapped)
  pressure: number;         // 0-1 (950-1050 hPa mapped)
  cloudCover: number;       // 0-1 (0-100% mapped)
  precipitation: number;    // 0-1 (0-50mm mapped)
  stormIntensity: number;   // 0-1 (derived from weather code)
  timeOfDay: number;        // 0-1 (midnight to midnight)
  goldenHour: number;       // 0-1 (intensity of golden hour)
  blueHour: number;         // 0-1 (intensity of blue hour)
}

export interface KelvinColor {
  temperature: number;      // 2000K - 10000K
  rgb: [number, number, number];
}

export interface AtmosphericState {
  noiseFrequency: number;
  noiseAmplitude: number;
  bloomIntensity: number;
  chromaticAberration: number;
  grainIntensity: number;
  grainSize: number;
  visualGravity: number;
  colorTemperature: KelvinColor;
  weatherCondition: WeatherCondition;
  timePhase: TimePhase;
  rainIntensity: number;
  snowIntensity: number;
  fogDensity: number;
  cloudDensity: number;
  sunIntensity: number;
}

interface WeatherStore {
  // Raw data
  rawWeather: WeatherData | null;
  location: { lat: number; lon: number; name: string } | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  activeDate: string | null;
  activeHour: string | null;

  // Forecasts
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];

  // Normalized values (0-1)
  normalized: NormalizedWeather;
  
  // Atmospheric visual state
  atmosphere: AtmosphericState;

  // Micro-copy
  mood: string;
  headline: string;
  
  // Actions
  setWeatherData: (data: WeatherData) => void;
  setForecastData: (hourly: HourlyForecast[], daily: DailyForecast[]) => void;
  setHourlyForecast: (hourly: HourlyForecast[]) => void;
  setLocation: (lat: number, lon: number, name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveDate: (date: string | null) => void;
  setActiveHour: (isoTime: string | null) => void;
}

const normalizeValue = (value: number, min: number, max: number): number => {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

const kelvinToRGB = (kelvin: number): [number, number, number] => {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return [r / 255, g / 255, b / 255];
};

const getStormIntensity = (weatherCode: number): number => {
  if (weatherCode >= 95) return 1.0;      // Thunderstorm
  if (weatherCode >= 80) return 0.7;      // Rain showers
  if (weatherCode >= 70) return 0.5;      // Snow
  if (weatherCode >= 60) return 0.4;      // Rain
  if (weatherCode >= 50) return 0.2;      // Drizzle
  if (weatherCode >= 40) return 0.15;     // Fog
  if (weatherCode >= 3) return 0.05;      // Overcast
  return 0;
};

const calculateTimeOfDay = (sunrise: string, sunset: string, observationTime?: string): { 
  timeOfDay: number; 
  goldenHour: number; 
  blueHour: number;
  kelvin: number;
} => {
  const reference = observationTime ? new Date(observationTime) : new Date();
  const hours = reference.getHours() + reference.getMinutes() / 60;
  const timeOfDay = hours / 24;

  const sunriseHour = parseInt(sunrise.split(':')[0]) + parseInt(sunrise.split(':')[1]) / 60;
  const sunsetHour = parseInt(sunset.split(':')[0]) + parseInt(sunset.split(':')[1]) / 60;
  
  const goldenDuration = 1.0;
  const blueDuration = 0.5;

  let goldenHour = 0;
  let blueHour = 0;
  let kelvin = 6500;

  // Morning blue hour
  if (hours >= sunriseHour - blueDuration && hours < sunriseHour) {
    blueHour = 1 - Math.abs(hours - (sunriseHour - blueDuration / 2)) / (blueDuration / 2);
    kelvin = 9000 + blueHour * 1000;
  }
  // Morning golden hour
  else if (hours >= sunriseHour && hours < sunriseHour + goldenDuration) {
    goldenHour = 1 - Math.abs(hours - (sunriseHour + goldenDuration / 2)) / (goldenDuration / 2);
    kelvin = 2500 + (1 - goldenHour) * 2000;
  }
  // Midday
  else if (hours >= sunriseHour + goldenDuration && hours < sunsetHour - goldenDuration) {
    kelvin = 5500 + Math.sin((hours - 12) * Math.PI / 12) * 500;
  }
  // Evening golden hour
  else if (hours >= sunsetHour - goldenDuration && hours < sunsetHour) {
    goldenHour = 1 - Math.abs(hours - (sunsetHour - goldenDuration / 2)) / (goldenDuration / 2);
    kelvin = 2500 + (1 - goldenHour) * 2000;
  }
  // Evening blue hour
  else if (hours >= sunsetHour && hours < sunsetHour + blueDuration) {
    blueHour = 1 - Math.abs(hours - (sunsetHour + blueDuration / 2)) / (blueDuration / 2);
    kelvin = 9000 + blueHour * 1000;
  }
  // Night
  else {
    kelvin = 4000;
  }

  return { timeOfDay, goldenHour: Math.max(0, goldenHour), blueHour: Math.max(0, blueHour), kelvin };
};

const getMoodAndHeadline = (normalized: NormalizedWeather, weatherCode: number): { mood: string; headline: string } => {
  const moods: Record<string, { mood: string; headlines: string[] }> = {
    storm: {
      mood: 'dramatic',
      headlines: [
        'The sky speaks in thunder',
        'Electric atmosphere',
        'Nature\'s symphony unfolds',
      ],
    },
    rain: {
      mood: 'contemplative',
      headlines: [
        'A day for dreaming',
        'Let the rain compose',
        'Rhythm of the clouds',
      ],
    },
    cloudy: {
      mood: 'serene',
      headlines: [
        'Soft light embraces',
        'Gentle grey canvas',
        'Whispers of change',
      ],
    },
    sunny: {
      mood: 'energetic',
      headlines: [
        'Charged with energy',
        'Golden possibilities',
        'Radiant momentum',
      ],
    },
    snow: {
      mood: 'peaceful',
      headlines: [
        'Silence falls softly',
        'Crystal stillness',
        'Winter\'s gentle touch',
      ],
    },
    fog: {
      mood: 'mysterious',
      headlines: [
        'Veiled in mystery',
        'Between worlds',
        'The unseen beckons',
      ],
    },
    windy: {
      mood: 'restless',
      headlines: [
        'Winds of change',
        'Untamed currents',
        'Movement in the air',
      ],
    },
    clear_night: {
      mood: 'tranquil',
      headlines: [
        'Stars illuminate',
        'Cosmic stillness',
        'Night\'s embrace',
      ],
    },
  };

  let category: string;
  
  if (normalized.stormIntensity > 0.7) category = 'storm';
  else if (weatherCode >= 70 && weatherCode < 80) category = 'snow';
  else if (weatherCode >= 50 && weatherCode < 70) category = 'rain';
  else if (weatherCode >= 40 && weatherCode < 50) category = 'fog';
  else if (normalized.windSpeed > 0.6) category = 'windy';
  else if (normalized.cloudCover > 0.6) category = 'cloudy';
  else if (normalized.timeOfDay < 0.25 || normalized.timeOfDay > 0.85) category = 'clear_night';
  else category = 'sunny';

  const selected = moods[category];
  const headline = selected.headlines[Math.floor(Math.random() * selected.headlines.length)];

  return { mood: selected.mood, headline };
};

const getWeatherCondition = (weatherCode: number): WeatherCondition => {
  if (weatherCode >= 95) return 'storm';
  if (weatherCode >= 71 && weatherCode < 80) return 'snow';
  if (weatherCode >= 51 && weatherCode < 71) return 'rain';
  if (weatherCode >= 40 && weatherCode < 50) return 'fog';
  if (weatherCode >= 2 && weatherCode < 40) return 'cloudy';
  return 'clear';
};

const getTimePhase = (timeOfDay: number, sunrise: string, sunset: string): TimePhase => {
  const hours = timeOfDay * 24;
  const sunriseHour = parseInt(sunrise.split(':')[0]) + parseInt(sunrise.split(':')[1]) / 60;
  const sunsetHour = parseInt(sunset.split(':')[0]) + parseInt(sunset.split(':')[1]) / 60;
  
  if (hours >= sunriseHour - 1 && hours < sunriseHour + 1) return 'dawn';
  if (hours >= sunsetHour - 1.5 && hours < sunsetHour + 0.5) return 'evening';
  if (hours >= sunriseHour + 1 && hours < sunsetHour - 1.5) return 'day';
  return 'night';
};

const calculateAtmosphere = (
  normalized: NormalizedWeather,
  kelvin: number,
  weatherCode: number,
  sunrise: string,
  sunset: string
): AtmosphericState => {
  const weatherCondition = getWeatherCondition(weatherCode);
  const timePhase = getTimePhase(normalized.timeOfDay, sunrise, sunset);
  
  // Calculate weather-specific intensities
  let rainIntensity = 0;
  let snowIntensity = 0;
  let fogDensity = 0;
  let cloudDensity = normalized.cloudCover;
  let sunIntensity = 1 - normalized.cloudCover;
  
  if (weatherCondition === 'rain' || weatherCondition === 'storm') {
    const base = weatherCondition === 'storm' ? 0.6 : 0.4;
    rainIntensity = Math.max(base, normalized.precipitation + normalized.stormIntensity * 0.5);
  }
  if (weatherCondition === 'snow') {
    snowIntensity = Math.max(0.45, normalized.precipitation * 0.8 + 0.2);
  }
  if (weatherCondition === 'fog') {
    fogDensity = Math.max(0.55, 0.4 + normalized.humidity * 0.6);
  }
  
  // Adjust based on time of day
  if (timePhase === 'night') {
    sunIntensity = 0;
    cloudDensity *= 0.7;
  } else if (timePhase === 'dawn' || timePhase === 'evening') {
    sunIntensity *= 0.6;
  }
  
  return {
    noiseFrequency: 0.5 + normalized.windSpeed * 2.0,
    noiseAmplitude: 0.3 + normalized.stormIntensity * 0.7,
    bloomIntensity: 0.1 + normalized.humidity * 0.6,
    chromaticAberration: normalized.stormIntensity * 0.02 + normalized.windSpeed * 0.01,
    grainIntensity: 0.03 + normalized.temperature * 0.05,
    grainSize: normalized.temperature > 0.5 ? 2.0 : 1.0,
    visualGravity: 1 - normalizeValue(normalized.pressure, 0, 1) * 0.5,
    colorTemperature: {
      temperature: kelvin,
      rgb: kelvinToRGB(kelvin),
    },
    weatherCondition,
    timePhase,
    rainIntensity: Math.min(1, rainIntensity),
    snowIntensity: Math.min(1, snowIntensity),
    fogDensity: Math.min(1, fogDensity),
    cloudDensity: Math.min(1, cloudDensity),
    sunIntensity: Math.max(0, sunIntensity),
  };
};

const defaultNormalized: NormalizedWeather = {
  temperature: 0.5,
  humidity: 0.5,
  windSpeed: 0.2,
  windDirection: 0,
  pressure: 0.5,
  cloudCover: 0.3,
  precipitation: 0,
  stormIntensity: 0,
  timeOfDay: 0.5,
  goldenHour: 0,
  blueHour: 0,
};

// Note: stars must remain visible at night regardless of cloud cover
// (handled in atmosphere shader; keep this normalized state in sync)
const defaultAtmosphere: AtmosphericState = {
  noiseFrequency: 1.0,
  noiseAmplitude: 0.5,
  bloomIntensity: 0.3,
  chromaticAberration: 0.005,
  grainIntensity: 0.05,
  grainSize: 1.5,
  visualGravity: 0.5,
  colorTemperature: {
    temperature: 6500,
    rgb: kelvinToRGB(6500),
  },
  weatherCondition: 'clear',
  timePhase: 'day',
  rainIntensity: 0,
  snowIntensity: 0,
  fogDensity: 0,
  cloudDensity: 0.3,
  sunIntensity: 0.7,
};

export const useWeatherStore = create<WeatherStore>((set) => ({
  rawWeather: null,
  location: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  activeDate: null,
  activeHour: null,
  hourlyForecast: [],
  dailyForecast: [],
  normalized: defaultNormalized,
  atmosphere: defaultAtmosphere,
  mood: 'serene',
  headline: 'Atmospheric intelligence',

  setWeatherData: (data: WeatherData) => {
    const timeData = calculateTimeOfDay(data.sunrise, data.sunset, data.observationTime);
    
    const normalized: NormalizedWeather = {
      temperature: normalizeValue(data.temperature, -20, 45),
      humidity: normalizeValue(data.humidity, 0, 100),
      windSpeed: normalizeValue(data.windSpeed, 0, 100),
      windDirection: normalizeValue(data.windDirection, 0, 360),
      pressure: normalizeValue(data.pressure, 950, 1050),
      cloudCover: normalizeValue(data.cloudCover, 0, 100),
      precipitation: normalizeValue(data.precipitation, 0, 50),
      stormIntensity: getStormIntensity(data.weatherCode),
      timeOfDay: timeData.timeOfDay,
      goldenHour: timeData.goldenHour,
      blueHour: timeData.blueHour,
    };

    const atmosphere = calculateAtmosphere(normalized, timeData.kelvin, data.weatherCode, data.sunrise, data.sunset);
    const { mood, headline } = getMoodAndHeadline(normalized, data.weatherCode);

    set({
      rawWeather: data,
      normalized,
      atmosphere,
      mood,
      headline,
      lastUpdated: new Date(),
      isLoading: false,
      error: null,
    });
  },

  setLocation: (lat: number, lon: number, name: string) => {
    set({ location: { lat, lon, name } });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  setForecastData: (hourly: HourlyForecast[], daily: DailyForecast[]) => {
    set({ hourlyForecast: hourly, dailyForecast: daily });
  },

  setHourlyForecast: (hourly: HourlyForecast[]) => {
    set({ hourlyForecast: hourly });
  },

  setActiveDate: (date: string | null) => {
    set({ activeDate: date });
  },

  setActiveHour: (isoTime: string | null) => {
    set({ activeHour: isoTime });
  },
}));
