import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { AtmosphereBackground } from './AtmosphereBackground';
import { PostProcessing } from './PostProcessing';
import { Atmosphere } from './weather/Atmosphere';
import { useWeatherStore } from '../store/weatherStore';
import './WeatherScene.css';

type WeatherSceneProps = {
  variant?: 'background' | 'overlay';
};

type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

const mapWeatherCodeToCondition = (code: number): WeatherCondition => {
  if (code >= 95) return 'storm';
  if (code >= 71 && code < 80) return 'snow';
  if (code >= 51 && code < 71) return 'rain';
  if (code >= 40 && code < 50) return 'fog';
  if (code >= 2 && code < 40) return 'cloudy';
  return 'clear';
};

const FogLayer = () => {
  const { atmosphere } = useWeatherStore();
  const { scene } = useThree();

  useEffect(() => {
    const density = THREE.MathUtils.lerp(0.001, 0.08, atmosphere.fogDensity);
    const fog = new THREE.FogExp2('#03050a', density);
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [atmosphere.fogDensity, scene]);

  return null;
};

export const WeatherScene = ({ variant = 'background' }: WeatherSceneProps) => {
  const { rawWeather, atmosphere, normalized, hourlyForecast } = useWeatherStore();

  const nextHour = hourlyForecast[0];
  const forecastCondition = nextHour ? mapWeatherCodeToCondition(nextHour.weatherCode) : null;
  const forecastPrecip = nextHour?.precipitation ?? 0;

  let effectiveCondition: WeatherCondition = atmosphere.weatherCondition;
  let rainIntensity = atmosphere.rainIntensity;
  let snowIntensity = atmosphere.snowIntensity;

  if (nextHour && forecastPrecip > 0.05) {
    if (forecastCondition === 'snow') {
      const forecastSnow = Math.min(1, 0.35 + forecastPrecip * 0.18);
      snowIntensity = Math.max(snowIntensity, forecastSnow);
      effectiveCondition = 'snow';
    } else if (forecastCondition === 'rain' || forecastCondition === 'storm') {
      const forecastRain = Math.min(1, 0.25 + forecastPrecip * 0.15);
      rainIntensity = Math.max(rainIntensity, forecastRain);
      effectiveCondition = forecastCondition === 'storm' ? 'storm' : 'rain';
    }
  }

  const mode: 'rain' | 'snow' | 'storm' | 'clear' | 'foggy' = useMemo(() => {
    if (snowIntensity > 0.3) return 'snow';
    if (effectiveCondition === 'storm' || normalized.stormIntensity > 0.75) return 'storm';
    if (rainIntensity > 0.25) return 'rain';
    if (effectiveCondition === 'fog' || atmosphere.fogDensity > 0.45) return 'foggy';
    return 'clear';
  }, [atmosphere.fogDensity, effectiveCondition, normalized.stormIntensity, rainIntensity, snowIntensity]);

  const windSpeed = rawWeather?.windSpeed ?? 5;
  const windDirection = normalized.windDirection * Math.PI * 2;
  const precipitationIntensity = rainIntensity;
  const visibility = 1 - atmosphere.fogDensity;
  const cloudDensity = atmosphere.cloudDensity;
  const fogDensity = atmosphere.fogDensity;
  const isThunderActive = mode === 'storm';

  const wrapperClass = variant === 'overlay' ? 'weather-scene weather-scene--overlay' : 'weather-scene';

  return (
    <div className={wrapperClass}>
      <Canvas
        className="weather-scene__canvas"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          <AtmosphereBackground />
          <Atmosphere
            mode={mode}
            windSpeed={windSpeed * 0.05}
            windDirection={windDirection}
            precipitationIntensity={precipitationIntensity}
            snowIntensity={snowIntensity}
            visibility={visibility}
            cloudDensity={cloudDensity}
            fogDensity={fogDensity}
            isThunderActive={isThunderActive}
          />
          <FogLayer />
          <PostProcessing />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
};
