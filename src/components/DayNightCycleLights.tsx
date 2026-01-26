import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWeatherStore } from '../store/weatherStore';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const parseHour = (value?: string | null): number | null => {
  if (!value) return null;
  const [h, m] = value.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours + minutes / 60;
};

const getObservationHours = (
  normalized: ReturnType<typeof useWeatherStore.getState>['normalized'],
  rawWeather: ReturnType<typeof useWeatherStore.getState>['rawWeather']
) => {
  if (rawWeather?.observationTime) {
    const reference = new Date(rawWeather.observationTime);
    return reference.getHours() + reference.getMinutes() / 60 + reference.getSeconds() / 3600;
  }
  if (normalized) {
    return normalized.timeOfDay * 24;
  }
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
};

type CycleState = {
  sunPosition: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  moonPosition: THREE.Vector3;
  moonColor: THREE.Color;
  moonIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  starOpacity: number;
};

const defaultCycleState: CycleState = {
  sunPosition: new THREE.Vector3(40, 50, 20),
  sunColor: new THREE.Color('#fff5d9'),
  sunIntensity: 1,
  moonPosition: new THREE.Vector3(-30, -10, -40),
  moonColor: new THREE.Color('#9cb9ff'),
  moonIntensity: 0.1,
  ambientColor: new THREE.Color('#1a1f2b'),
  ambientIntensity: 0.2,
  starOpacity: 0,
};

const computeCycleState = (
  normalized: ReturnType<typeof useWeatherStore.getState>['normalized'],
  rawWeather: ReturnType<typeof useWeatherStore.getState>['rawWeather'],
  atmosphere: ReturnType<typeof useWeatherStore.getState>['atmosphere']
): CycleState => {
  if (!normalized) return defaultCycleState;

  const hours = getObservationHours(normalized, rawWeather);
  const sunriseHour = parseHour(rawWeather?.sunrise) ?? 6;
  const sunsetHour = parseHour(rawWeather?.sunset) ?? 18;
  const daylightSpan = Math.max(1, sunsetHour - sunriseHour);
  const azimuthDeg = (hours / 24) * 360 - 90;
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);

  const isDaylight = hours >= sunriseHour && hours < sunsetHour;
  const dayProgress = clamp((hours - sunriseHour) / daylightSpan);
  const sunArc = isDaylight ? Math.sin(dayProgress * Math.PI) : 0;
  const sunElevation = isDaylight
    ? THREE.MathUtils.lerp(0.1, 0.95, sunArc) * (Math.PI / 2)
    : THREE.MathUtils.degToRad(-6);

  const sunPosition = new THREE.Vector3(
    Math.cos(sunElevation) * Math.cos(azimuth),
    Math.sin(sunElevation),
    Math.cos(sunElevation) * Math.sin(azimuth)
  ).multiplyScalar(60);

  const sunColor = new THREE.Color('#ffe0b5');
  const middayColor = new THREE.Color('#ffffff');
  const dawnColor = new THREE.Color('#ff9b6a');
  const duskBlend = 1 - Math.abs(dayProgress - 0.5) * 2;
  sunColor.lerp(middayColor, clamp(sunArc));
  sunColor.lerp(dawnColor, clamp(duskBlend) * 0.6);

  const sunIntensity = isDaylight
    ? clamp(THREE.MathUtils.lerp(0.15, 1.3, sunArc) * (0.4 + atmosphere.sunIntensity * 0.8))
    : 0;

  const nightDuration = 24 - daylightSpan;
  let nightProgress = 0;
  if (!isDaylight && nightDuration > 0) {
    nightProgress = hours >= sunsetHour
      ? (hours - sunsetHour) / nightDuration
      : (hours + (24 - sunsetHour)) / nightDuration;
    nightProgress = clamp(nightProgress);
  }

  const moonArc = !isDaylight ? Math.sin(nightProgress * Math.PI) : 0;
  const moonAzimuth = azimuth + Math.PI;
  const moonElevation = !isDaylight
    ? THREE.MathUtils.lerp(0.05, 0.7, moonArc) * (Math.PI / 2)
    : THREE.MathUtils.degToRad(-10);

  const moonPosition = new THREE.Vector3(
    Math.cos(moonElevation) * Math.cos(moonAzimuth),
    Math.sin(moonElevation),
    Math.cos(moonElevation) * Math.sin(moonAzimuth)
  ).multiplyScalar(55);

  const moonColor = new THREE.Color('#bcd4ff').lerp(new THREE.Color('#7a8cc7'), clamp(moonArc));
  const moonIntensity = !isDaylight ? THREE.MathUtils.lerp(0.05, 0.35, moonArc) : 0;

  const ambientColor = new THREE.Color(isDaylight ? '#f6f1e8' : '#1d2434');
  if (isDaylight) {
    ambientColor.lerp(new THREE.Color('#ffd9b0'), clamp(duskBlend));
  } else {
    ambientColor.lerp(new THREE.Color('#708bff'), clamp(moonArc));
  }
  const ambientIntensity = isDaylight
    ? THREE.MathUtils.lerp(0.2, 0.6, sunArc)
    : THREE.MathUtils.lerp(0.04, 0.22, moonArc + 0.05);

  const twilightWindowHours = 1.2;
  const distanceToSunrise = Math.min(
    Math.abs(hours - sunriseHour),
    Math.abs(hours - (sunriseHour + 24))
  );
  const distanceToSunset = Math.min(
    Math.abs(hours - sunsetHour),
    Math.abs(hours - (sunsetHour - 24))
  );
  const closestEdge = Math.min(distanceToSunrise, distanceToSunset);
  let starOpacity = 0;
  if (!isDaylight) {
    const distanceFactor = clamp(closestEdge / twilightWindowHours);
    const visibility = Math.pow(distanceFactor, 1.4);
    starOpacity = clamp(visibility * (0.2 + moonArc * 0.45));
  }

  return {
    sunPosition,
    sunColor,
    sunIntensity,
    moonPosition,
    moonColor,
    moonIntensity,
    ambientColor,
    ambientIntensity,
    starOpacity,
  };
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let temp = Math.imul(state ^ (state >>> 15), 1 | state);
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), 61 | temp);
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296;
  };
};

const STAR_COUNT = 1800;

type StarField = {
  geometry: THREE.BufferGeometry;
  colorAttribute: THREE.BufferAttribute;
  baseColors: Float32Array;
  twinkleOffsets: Float32Array;
  twinkleSpeeds: Float32Array;
  twinkleStrengths: Float32Array;
};

const createStarField = (): StarField => {
  const radius = 85;
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const baseColors = new Float32Array(STAR_COUNT * 3);
  const twinkleOffsets = new Float32Array(STAR_COUNT);
  const twinkleSpeeds = new Float32Array(STAR_COUNT);
  const twinkleStrengths = new Float32Array(STAR_COUNT);
  const rand = createSeededRandom(0x1a2b3c);
  const coolColor = new THREE.Color('#d8e4ff');
  const warmColor = new THREE.Color('#ffd9c3');

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const theta = rand() * 2 * Math.PI;
    const phi = Math.acos(THREE.MathUtils.lerp(-0.95, 0.95, rand()));
    const r = radius * (0.85 + rand() * 0.2);
    const idx = i * 3;
    positions[idx] = r * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = r * Math.cos(phi);
    positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tint = coolColor.clone().lerp(warmColor, rand() * 0.6);
    baseColors[idx] = tint.r;
    baseColors[idx + 1] = tint.g;
    baseColors[idx + 2] = tint.b;
    colors[idx] = tint.r;
    colors[idx + 1] = tint.g;
    colors[idx + 2] = tint.b;

    twinkleOffsets[i] = rand() * Math.PI * 2;
    twinkleSpeeds[i] = 0.4 + rand() * 1.4;
    twinkleStrengths[i] = 0.18 + rand() * 0.25;
  }

  const geometry = new THREE.BufferGeometry();
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', colorAttribute);

  return { geometry, colorAttribute, baseColors, twinkleOffsets, twinkleSpeeds, twinkleStrengths };
};

const NightSky = ({ opacityTarget }: { opacityTarget: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const starField = useMemo(() => createStarField(), []);
  const colorAttributeRef = useRef(starField.colorAttribute);
  const baseColorsRef = useRef(starField.baseColors);
  const twinkleOffsetsRef = useRef(starField.twinkleOffsets);
  const twinkleSpeedsRef = useRef(starField.twinkleSpeeds);
  const twinkleStrengthsRef = useRef(starField.twinkleStrengths);

  useFrame((state) => {
    const colorAttribute = colorAttributeRef.current;
    const colorArray = colorAttribute.array as Float32Array;
    const baseColors = baseColorsRef.current;
    const twinkleOffsets = twinkleOffsetsRef.current;
    const twinkleSpeeds = twinkleSpeedsRef.current;
    const twinkleStrengths = twinkleStrengthsRef.current;

    const time = state.clock.elapsedTime;
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const idx = i * 3;
      const oscillation = Math.sin(time * twinkleSpeeds[i] + twinkleOffsets[i]);
      const intensity = THREE.MathUtils.clamp(0.7 + oscillation * twinkleStrengths[i], 0.45, 1.1);
      const highlight = Math.max(0, intensity - 0.85) * 0.6;
      colorArray[idx] = Math.min(1, baseColors[idx] * intensity + highlight);
      colorArray[idx + 1] = Math.min(1, baseColors[idx + 1] * intensity + highlight);
      colorArray[idx + 2] = Math.min(1, baseColors[idx + 2] * intensity + highlight);
    }
    colorAttribute.needsUpdate = true;

    if (!materialRef.current) return;
    materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, opacityTarget, 0.04);
    if (pointsRef.current) {
      pointsRef.current.visible = materialRef.current.opacity > 0.01;
    }
  });

  return (
    <points ref={pointsRef} geometry={starField.geometry} frustumCulled={false} renderOrder={10}>
      <pointsMaterial
        ref={materialRef}
        attach="material"
        size={0.28}
        color={new THREE.Color('#ffffff')}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        vertexColors
      />
    </points>
  );
};

export const DayNightCycleLights = () => {
  const { normalized, rawWeather, atmosphere } = useWeatherStore();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  const cycleState = useMemo(
    () => computeCycleState(normalized, rawWeather, atmosphere),
    [normalized, rawWeather, atmosphere]
  );

  useFrame(() => {
    if (sunLightRef.current) {
      sunLightRef.current.position.lerp(cycleState.sunPosition, 0.1);
      sunLightRef.current.intensity = THREE.MathUtils.lerp(
        sunLightRef.current.intensity,
        cycleState.sunIntensity,
        0.1
      );
      sunLightRef.current.color.lerp(cycleState.sunColor, 0.1);
      sunLightRef.current.target.position.set(0, 0, 0);
      sunLightRef.current.target.updateMatrixWorld();
    }

    if (moonLightRef.current) {
      moonLightRef.current.position.lerp(cycleState.moonPosition, 0.08);
      moonLightRef.current.intensity = THREE.MathUtils.lerp(
        moonLightRef.current.intensity,
        cycleState.moonIntensity,
        0.1
      );
      moonLightRef.current.color.lerp(cycleState.moonColor, 0.1);
      moonLightRef.current.target.position.set(0, 0, 0);
      moonLightRef.current.target.updateMatrixWorld();
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        cycleState.ambientIntensity,
        0.1
      );
      ambientRef.current.color.lerp(cycleState.ambientColor, 0.1);
    }
  });

  return (
    <>
      <directionalLight
        ref={sunLightRef}
        intensity={cycleState.sunIntensity}
        color={cycleState.sunColor}
        position={cycleState.sunPosition.toArray()}
        castShadow={false}
      />
      <directionalLight
        ref={moonLightRef}
        intensity={cycleState.moonIntensity}
        color={cycleState.moonColor}
        position={cycleState.moonPosition.toArray()}
        castShadow={false}
      />
      <ambientLight
        ref={ambientRef}
        intensity={cycleState.ambientIntensity}
        color={cycleState.ambientColor}
      />
      <NightSky opacityTarget={cycleState.starOpacity} />
    </>
  );
};
