import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { rainVertexShader, rainFragmentShader } from '../../shaders/weatherAtmosphere';
import { useWeatherControls } from './controls';

const DROP_COUNT = 6000;

const createRandomGenerator = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const RainMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 12,
    uWind: 0,
    uStretch: 4,
    uOpacity: 0.7,
    uColor: new THREE.Color('#c8d4e0'),
    uBounds: new THREE.Vector2(40, 25),
  },
  rainVertexShader,
  rainFragmentShader
);

extend({ RainMaterial });

type RainMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uSpeed: number;
  uWind: number;
  uStretch: number;
  uOpacity: number;
  uColor: THREE.Color;
  uBounds: THREE.Vector2;
};

export const Rain = () => {
  const controls = useWeatherControls();
  const materialRef = useRef<RainMaterialType>(null);

  const geometry = useMemo(() => {
    const random = createRandomGenerator(0xcafebabe);
    const base = new THREE.PlaneGeometry(0.02, 0.35, 1, 4);
    const instanced = new THREE.InstancedBufferGeometry();
    instanced.instanceCount = DROP_COUNT;

    instanced.setAttribute('position', base.attributes.position.clone());
    instanced.setAttribute('uv', base.attributes.uv.clone());
    if (base.index) instanced.setIndex(base.index.clone());

    const offsets = new Float32Array(DROP_COUNT * 3);
    const randoms = new Float32Array(DROP_COUNT);
    const phases = new Float32Array(DROP_COUNT);

    for (let i = 0; i < DROP_COUNT; i++) {
      const offsetX = random() - 0.5;
      const offsetY = random() - 0.5;
      const offsetZ = random() - 0.5;

      offsets[i * 3] = offsetX * 40;
      offsets[i * 3 + 1] = offsetY * 50;
      offsets[i * 3 + 2] = offsetZ * 30;

      randoms[i] = random();
      phases[i] = random();
    }

    instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    instanced.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1));
    instanced.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));

    base.dispose();
    return instanced;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const { windX, windSpeed, precipitationIntensity } = controls.current;

    materialRef.current.uTime = clock.elapsedTime;
    materialRef.current.uSpeed = THREE.MathUtils.lerp(
      materialRef.current.uSpeed,
      8 + precipitationIntensity * 20,
      0.05
    );
    materialRef.current.uWind = THREE.MathUtils.lerp(
      materialRef.current.uWind,
      windX,
      0.1
    );
    materialRef.current.uStretch = THREE.MathUtils.lerp(
      materialRef.current.uStretch,
      3.0 + windSpeed * 0.3 + precipitationIntensity * 2.5,
      0.05
    );
    materialRef.current.uOpacity = THREE.MathUtils.lerp(
      materialRef.current.uOpacity,
      precipitationIntensity,
      0.05
    );
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
      {/* @ts-expect-error - custom intrinsic from drei shaderMaterial */}
      <rainMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
