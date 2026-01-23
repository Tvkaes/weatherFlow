import { Object3DNode } from '@react-three/fiber';
import { ShaderMaterial, Vector2, Vector3 } from 'three';

declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: Object3DNode<ShaderMaterial, typeof ShaderMaterial> & {
      uTime?: number;
      uNoiseFrequency?: number;
      uNoiseAmplitude?: number;
      uDistortion?: number;
      uCloudCover?: number;
      uHumidity?: number;
      uStormIntensity?: number;
      uTimeOfDay?: number;
      uGoldenHour?: number;
      uBlueHour?: number;
      uTemperature?: number;
      uColorTemperature?: Vector3;
      uResolution?: Vector2;
      uRainIntensity?: number;
      uSnowIntensity?: number;
      uFogDensity?: number;
      uCloudDensity?: number;
      uSunIntensity?: number;
      uTimePhase?: number;
    };
  }
}
