import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { snowVertexShader, snowFragmentShader } from '../../shaders/weatherAtmosphere';
import { useWeatherControls } from './controls';

const FLAKE_COUNT = 6000;

const SnowMaterial = shaderMaterial(
  {
    uTime: 0,
    uAreaSize: new THREE.Vector2(40, 30),
    uWind: new THREE.Vector2(0, 0),
    uDriftStrength: 0.5,
    uOpacity: 0.8,
  },
  snowVertexShader,
  snowFragmentShader
);

extend({ SnowMaterial });

type SnowMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uAreaSize: THREE.Vector2;
  uWind: THREE.Vector2;
  uDriftStrength: number;
  uOpacity: number;
};

export const Snow = () => {
  const controls = useWeatherControls();
  const materialRef = useRef<SnowMaterialType>(null);

  const geometry = useMemo(() => {
    const base = new THREE.CircleGeometry(0.12, 32);
    const instanced = new THREE.InstancedBufferGeometry();
    instanced.instanceCount = FLAKE_COUNT;
    instanced.setAttribute('position', base.attributes.position.clone());
    instanced.setAttribute('uv', base.attributes.uv.clone());
    if (base.index) instanced.setIndex(base.index.clone());

    const offsets = new Float32Array(FLAKE_COUNT * 3);
    const scales = new Float32Array(FLAKE_COUNT);
    const phases = new Float32Array(FLAKE_COUNT);
    const seeds = new Float32Array(FLAKE_COUNT);

    for (let i = 0; i < FLAKE_COUNT; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * 40;
      offsets[i * 3 + 1] = Math.random() * 25;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 10;

      scales[i] = 0.5 + Math.random() * 0.6;
      phases[i] = Math.random() * Math.PI * 2;
      seeds[i] = Math.random();
    }

    instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    instanced.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    instanced.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    instanced.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));

    base.dispose();
    return instanced;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const { windX, windZ, windSpeed, snowIntensity } = controls.current;
    materialRef.current.uTime = clock.elapsedTime;
    materialRef.current.uWind.set(windX, windZ);
    materialRef.current.uDriftStrength = 0.5 + windSpeed * 0.5;
    materialRef.current.uOpacity = THREE.MathUtils.lerp(
      materialRef.current.uOpacity,
      snowIntensity,
      0.05
    );
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
      {/* @ts-expect-error - JSX intrinsic element injected via extend */}
      <snowMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
