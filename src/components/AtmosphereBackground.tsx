import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useWeatherStore } from '../store/weatherStore';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../shaders/atmosphereShader';

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
  },
  atmosphereVertexShader,
  atmosphereFragmentShader
);

extend({ AtmosphereMaterial });

export const AtmosphereBackground = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { normalized, atmosphere } = useWeatherStore();

  const colorTempVector = useMemo(() => {
    return new THREE.Vector3(...atmosphere.colorTemperature.rgb);
  }, [atmosphere.colorTemperature.rgb]);

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

  useFrame((state) => {
    if (materialRef.current) {
      const mat = materialRef.current as any;
      
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
