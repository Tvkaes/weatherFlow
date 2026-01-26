import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useWeatherStore } from '../store/weatherStore';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../shaders/atmosphereShader';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const toHours = (value?: string): number | null => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours + minutes / 60;
};

const polarToScreen = (angleDeg: number, radius: number, centerX: number, centerY: number) => {
  const radians = THREE.MathUtils.degToRad(angleDeg);
  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY - Math.sin(radians) * radius,
  };
};

type CelestialState = {
  showSun: boolean;
  sunStrength: number;
  sunUv: [number, number];
  showMoon: boolean;
  moonStrength: number;
  moonUv: [number, number];
};

const defaultCelestialState: CelestialState = {
  showSun: false,
  sunStrength: 0,
  sunUv: [0.7, 0.3],
  showMoon: false,
  moonStrength: 0,
  moonUv: [0.3, 0.7],
};

const getCelestialState = (
  rawWeather: ReturnType<typeof useWeatherStore.getState>['rawWeather'],
  normalized: ReturnType<typeof useWeatherStore.getState>['normalized'],
  atmosphere: ReturnType<typeof useWeatherStore.getState>['atmosphere']
): CelestialState => {
  if (!normalized) return defaultCelestialState;

  const sunriseHour = toHours(rawWeather?.sunrise) ?? 6;
  const sunsetHour = toHours(rawWeather?.sunset) ?? 18;
  const hours = normalized.timeOfDay * 24;
  const daylightSpan = Math.max(1, sunsetHour - sunriseHour);
  const daylightProgress = clamp((hours - sunriseHour) / daylightSpan);
  const isDaylight = hours >= sunriseHour && hours < sunsetHour;

  const sunStrength = isDaylight ? Math.max(0, Math.sin(daylightProgress * Math.PI)) : 0;
  const sunScreen = polarToScreen(90 - daylightProgress * 180, 36, 52, 68);
  const sunUv: [number, number] = [sunScreen.x / 100, sunScreen.y / 100];

  const showSun =
    isDaylight &&
    (
      atmosphere.weatherCondition === 'clear' ||
      atmosphere.sunIntensity > 0.18 ||
      normalized.cloudCover < 0.6
    );

  const totalNight = 24 - daylightSpan;
  let nightElapsed = 0;
  if (!isDaylight) {
    nightElapsed = hours >= sunsetHour ? hours - sunsetHour : hours + (24 - sunsetHour);
  }
  const moonProgress = totalNight > 0 ? clamp(nightElapsed / totalNight) : 0;
  const moonStrength = !isDaylight ? Math.max(0, Math.sin(moonProgress * Math.PI)) : 0;
  const moonScreen = polarToScreen(-110 + moonProgress * 220, 42, 48, 72);
  const moonUv: [number, number] = [moonScreen.x / 100, moonScreen.y / 100];

  const showMoon = !isDaylight;

  return {
    showSun,
    sunStrength,
    sunUv,
    showMoon,
    moonStrength,
    moonUv,
  };
};

type AtmosphereMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uNoiseFrequency: number;
  uNoiseAmplitude: number;
  uDistortion: number;
  uCloudCover: number;
  uHumidity: number;
  uStormIntensity: number;
  uTimeOfDay: number;
  uGoldenHour: number;
  uBlueHour: number;
  uTemperature: number;
  uColorTemperature: THREE.Vector3;
  uResolution: THREE.Vector2;
  uRainIntensity: number;
  uSnowIntensity: number;
  uFogDensity: number;
  uCloudDensity: number;
  uSunIntensity: number;
  uTimePhase: number;
  uSunVisible: number;
  uSunStrength: number;
  uSunUv: THREE.Vector2;
  uMoonVisible: number;
  uMoonStrength: number;
  uMoonUv: THREE.Vector2;
};

const AtmosphereMaterial = shaderMaterial(
  {
    uTime: 0,
    uNoiseFrequency: 1.0,
    uNoiseAmplitude: 0.5,
    uDistortion: 0.1,
    uCloudCover: 0.3,
    uHumidity: 0.5,
    uStormIntensity: 0.0,
    uTimeOfDay: 0.5,
    uGoldenHour: 0.0,
    uBlueHour: 0.0,
    uTemperature: 0.5,
    uColorTemperature: new THREE.Vector3(1, 1, 1),
    uResolution: new THREE.Vector2(1920, 1080),
    // New weather condition uniforms
    uRainIntensity: 0.0,
    uSnowIntensity: 0.0,
    uFogDensity: 0.0,
    uCloudDensity: 0.3,
    uSunIntensity: 0.7,
    uTimePhase: 0.5,
    uSunVisible: 0,
    uSunStrength: 0,
    uSunUv: new THREE.Vector2(0.7, 0.3),
    uMoonVisible: 0,
    uMoonStrength: 0,
    uMoonUv: new THREE.Vector2(0.3, 0.7),
  },
  atmosphereVertexShader,
  atmosphereFragmentShader
);

extend({ AtmosphereMaterial });

export const AtmosphereBackground = () => {
  const materialRef = useRef<AtmosphereMaterialType>(null);
  const { normalized, atmosphere, rawWeather } = useWeatherStore();

  const colorTempVector = useMemo(() => {
    return new THREE.Vector3(...atmosphere.colorTemperature.rgb);
  }, [atmosphere.colorTemperature.rgb]);

  const sunUvVector = useMemo(() => new THREE.Vector2(0.7, 0.3), []);
  const moonUvVector = useMemo(() => new THREE.Vector2(0.3, 0.7), []);

  // Convert time phase string to numeric value for shader
  const timePhaseValue = useMemo(() => {
    const phases: Record<string, number> = {
      night: 0.0,
      dawn: 0.25,
      day: 0.5,
      evening: 0.75,
    };
    return phases[atmosphere.timePhase] ?? 0.5;
  }, [atmosphere.timePhase]);

  const celestialState = useMemo(() => {
    if (!normalized) return defaultCelestialState;
    return getCelestialState(rawWeather, normalized, atmosphere);
  }, [rawWeather, normalized, atmosphere]);

  const {
    showSun,
    sunStrength,
    sunUv,
    showMoon,
    moonStrength,
    moonUv,
  } = celestialState;

  useFrame((state) => {
    if (materialRef.current) {
      const mat = materialRef.current;
      
      // Smooth time progression affected by wind speed
      mat.uTime = state.clock.elapsedTime * (0.5 + normalized.windSpeed * 0.5);
      
      // Update uniforms from weather data
      mat.uNoiseFrequency = atmosphere.noiseFrequency;
      mat.uNoiseAmplitude = atmosphere.noiseAmplitude;
      mat.uDistortion = 0.05 + normalized.windSpeed * 0.15;
      mat.uCloudCover = normalized.cloudCover;
      mat.uHumidity = normalized.humidity;
      mat.uStormIntensity = normalized.stormIntensity;
      mat.uTimeOfDay = normalized.timeOfDay;
      mat.uGoldenHour = normalized.goldenHour;
      mat.uBlueHour = normalized.blueHour;
      mat.uTemperature = normalized.temperature;
      mat.uColorTemperature = colorTempVector;
      
      // New weather condition uniforms
      mat.uRainIntensity = atmosphere.rainIntensity;
      mat.uSnowIntensity = atmosphere.snowIntensity;
      mat.uFogDensity = atmosphere.fogDensity;
      mat.uCloudDensity = atmosphere.cloudDensity;
      mat.uSunIntensity = atmosphere.sunIntensity;
      mat.uTimePhase = timePhaseValue;

      sunUvVector.set(sunUv[0], sunUv[1]);
      moonUvVector.set(moonUv[0], moonUv[1]);
      mat.uSunVisible = showSun ? 1 : 0;
      mat.uSunStrength = sunStrength;
      mat.uSunUv = sunUvVector;
      mat.uMoonVisible = showMoon ? 1 : 0;
      mat.uMoonStrength = moonStrength;
      mat.uMoonUv = moonUvVector;
    }
  });

  return (
    <mesh position={[0, 0, -3]} scale={[40, 24, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <atmosphereMaterial
        ref={materialRef}
        transparent={false}
        depthWrite={false}
      />
    </mesh>
  );
};
