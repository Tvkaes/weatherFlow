import { useRef } from 'react';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { cloudsVertexShader, cloudsFragmentShader } from '../../shaders/weatherAtmosphere';
import { useWeatherControls } from './controls';

const CloudsMaterial = shaderMaterial(
  {
    uTime: 0,
    uDensity: 0.2,
    uWind: new THREE.Vector2(0, 0),
    uFlashIntensity: 0,
  },
  cloudsVertexShader,
  cloudsFragmentShader
);

extend({ CloudsMaterial });

type CloudsMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uDensity: number;
  uWind: THREE.Vector2;
  uFlashIntensity: number;
};

export const Clouds = () => {
  const controls = useWeatherControls();
  const materialRef = useRef<CloudsMaterialType>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uTime = clock.elapsedTime;
    materialRef.current.uDensity = THREE.MathUtils.lerp(
      materialRef.current.uDensity,
      controls.current.cloudDensity,
      0.04
    );
    materialRef.current.uWind.set(controls.current.windX, controls.current.windZ);
    materialRef.current.uFlashIntensity = THREE.MathUtils.lerp(
      materialRef.current.uFlashIntensity,
      controls.current.lightningFlash,
      0.25
    );
  });

  return (
    <group position={[0, 8, -6]}>
      <mesh scale={[70, 40, 1]} rotation={[-0.1, 0, 0]} frustumCulled={false} renderOrder={1}>
        <planeGeometry args={[1, 1, 1, 1]} />
        {/* @ts-expect-error custom jsx element */}
        <cloudsMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
