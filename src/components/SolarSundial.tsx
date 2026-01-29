import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import SunCalc from 'suncalc';
import { useWeatherStore } from '@/store/weatherStore';

export type UpdateSunPositionArgs = {
  latitude: number;
  longitude: number;
  date: Date;
  radius?: number;
};

export const getSunDirectionVector = ({ latitude, longitude, date, radius = 15 }: UpdateSunPositionArgs) => {
  const { azimuth, altitude } = SunCalc.getPosition(date, latitude, longitude);
  const x = radius * Math.sin(azimuth) * Math.cos(altitude);
  const y = radius * Math.sin(altitude);
  const z = radius * Math.cos(azimuth) * Math.cos(altitude);
  return new THREE.Vector3(x, y, z);
};

const useMarbleTexture = () => {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#dcd7cf');
      gradient.addColorStop(1, '#b8b0a6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 600; i += 1) {
        const alpha = Math.random() * 0.35;
        ctx.strokeStyle = `rgba(80, 80, 80, ${alpha})`;
        ctx.lineWidth = Math.random() * 1.2 + 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    texture.anisotropy = 4;
    return texture;
  }, []);
};

const SundialScene = ({ latitudeRad, sunDirection }: { latitudeRad: number; sunDirection: THREE.Vector3 }) => {
  const gnomonRef = useRef<THREE.Object3D>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const marbleTexture = useMarbleTexture();

  useEffect(() => {
    if (gnomonRef.current) {
      gnomonRef.current.rotation.z = -latitudeRad;
    }
  }, [latitudeRad]);

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(sunDirection);
      lightRef.current.castShadow = true;
      lightRef.current.shadow.mapSize.set(2048, 2048);
      lightRef.current.shadow.bias = -0.0002;
      lightRef.current.shadow.camera.near = 0.5;
      lightRef.current.shadow.camera.far = 60;
      lightRef.current.shadow.camera.top = 5;
      lightRef.current.shadow.camera.bottom = -5;
      lightRef.current.shadow.camera.left = -5;
      lightRef.current.shadow.camera.right = 5;
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
    }
  }, [sunDirection]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight ref={lightRef} intensity={1.1} color={0xfff8e3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 72]} />
        <meshStandardMaterial map={marbleTexture} roughness={0.7} metalness={0.05} />
      </mesh>

      <group ref={gnomonRef} position={[0, 0, 0]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 24]} />
          <meshStandardMaterial map={marbleTexture} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.15, 24]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0005, 0]} receiveShadow>
        <ringGeometry args={[0.05, 2.1, 64]} />
        <meshBasicMaterial color="rgba(0,0,0,0.25)" transparent opacity={0.2} />
      </mesh>
    </>
  );
};

export interface SolarSundialProps {
  latitude?: number;
  longitude?: number;
  date?: Date;
  className?: string;
  style?: React.CSSProperties;
}

export const SolarSundial = ({ latitude, longitude, date, className, style }: SolarSundialProps) => {
  const { location, rawWeather } = useWeatherStore();
  const lat = latitude ?? location?.lat ?? 40;
  const lon = longitude ?? location?.lon ?? -3;
  const referenceDate = date ?? (rawWeather?.observationTime ? new Date(rawWeather.observationTime) : new Date());
  const sunVector = useMemo(() => getSunDirectionVector({ latitude: lat, longitude: lon, date: referenceDate }), [lat, lon, referenceDate]);

  return (
    <div className={className} style={{ width: '100%', height: '180px', ...style }}>
      <Canvas
        shadows
        camera={{ position: [2.2, 1.6, 2.6], fov: 45 }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={[0x0b0d14]} />
        <SundialScene latitudeRad={THREE.MathUtils.degToRad(lat)} sunDirection={sunVector} />
      </Canvas>
    </div>
  );
};

export const updateSunPosition = (
  light: THREE.DirectionalLight,
  { latitude, longitude, date, radius = 20 }: UpdateSunPositionArgs
) => {
  const direction = getSunDirectionVector({ latitude, longitude, date, radius });
  light.position.copy(direction);
  light.target.position.set(0, 0, 0);
  light.target.updateMatrixWorld();
};
