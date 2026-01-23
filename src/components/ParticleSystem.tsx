import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWeatherStore } from '../store/weatherStore';

const SNOW_COUNT = 300;
const RAIN_COUNT = 400;

// Snow particles - soft round flakes
const SnowParticles = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { normalized, atmosphere } = useWeatherStore();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: SNOW_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 5
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        -0.01 - Math.random() * 0.02,
        0
      ),
      scale: 0.015 + Math.random() * 0.025,
      drift: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const windForce = normalized.windSpeed * 0.05;

    particles.forEach((particle, i) => {
      // Gentle drift motion for snow
      particle.velocity.x = Math.sin(time * 0.5 + particle.drift) * 0.01 + windForce * 0.02;
      particle.position.add(particle.velocity);

      if (particle.position.y < -8) {
        particle.position.y = 8;
        particle.position.x = (Math.random() - 0.5) * 20;
      }
      if (particle.position.x > 10) particle.position.x = -10;
      if (particle.position.x < -10) particle.position.x = 10;

      dummy.position.copy(particle.position);
      dummy.scale.setScalar(particle.scale * (1 + atmosphere.snowIntensity * 0.5));
      dummy.rotation.z = 0; // No rotation for round flakes
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SNOW_COUNT]}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.7 + atmosphere.snowIntensity * 0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};

// Rain particles - elongated drops
const RainParticles = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { normalized, atmosphere } = useWeatherStore();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: RAIN_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 5
      ),
      velocity: new THREE.Vector3(
        0,
        -0.15 - Math.random() * 0.1,
        0
      ),
      scale: 0.008 + Math.random() * 0.012,
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const windForce = normalized.windSpeed * 0.1;
    const windAngle = normalized.windDirection * Math.PI * 2;

    particles.forEach((particle, i) => {
      particle.velocity.x = Math.cos(windAngle) * windForce * 0.05;
      particle.position.add(particle.velocity);

      if (particle.position.y < -8) {
        particle.position.y = 8;
        particle.position.x = (Math.random() - 0.5) * 20;
      }
      if (particle.position.x > 10) particle.position.x = -10;
      if (particle.position.x < -10) particle.position.x = 10;

      dummy.position.copy(particle.position);
      dummy.scale.set(particle.scale * 0.3, particle.scale * 2.5, 1); // Elongated
      dummy.rotation.z = Math.atan2(particle.velocity.y, particle.velocity.x) + Math.PI / 2;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, RAIN_COUNT]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#a0c4ff"
        transparent
        opacity={0.4 + atmosphere.rainIntensity * 0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};

export const ParticleSystem = () => {
  const { atmosphere } = useWeatherStore();

  const isSnow = atmosphere.weatherCondition === 'snow' && atmosphere.snowIntensity > 0.1;
  const isRain = (atmosphere.weatherCondition === 'rain' || atmosphere.weatherCondition === 'storm') && atmosphere.rainIntensity > 0.1;

  if (!isSnow && !isRain) return null;

  return (
    <>
      {isSnow && <SnowParticles />}
      {isRain && <RainParticles />}
    </>
  );
};
