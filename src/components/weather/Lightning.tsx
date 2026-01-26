import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useWeatherControls, useWeatherControlsUpdater } from './controls';

const LIGHT_COLOR = new THREE.Color('#fff6db');

export const Lightning = () => {
  const controls = useWeatherControls();
  const updateControls = useWeatherControlsUpdater();
  const flashIntensity = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  const commitFlash = useCallback(() => {
    updateControls('lightningFlash', flashIntensity.current);
  }, [updateControls]);

  useFrame(() => {
    const thunder = controls.current.isThunderActive;

    if (thunder && Math.random() < 0.005) {
      flashIntensity.current = 1.5 + Math.random();
    }

    flashIntensity.current *= thunder ? 0.88 : 0.8;
    if (flashIntensity.current < 0.01) flashIntensity.current = 0;

    commitFlash();

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(0.7, flashIntensity.current);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 5, -10]} scale={[80, 60, 1]} renderOrder={0}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={LIGHT_COLOR}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
