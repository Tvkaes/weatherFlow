import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type ThreeElements } from '@react-three/fiber';
import gsap from 'gsap';
import { Clouds } from './Clouds';
import { Rain } from './Rain';
import { Snow } from './Snow';
import { Lightning } from './Lightning';
import {
  WeatherControlsContext,
  WeatherControlsUpdateContext,
  type WeatherControls,
  type WeatherControlsUpdater,
} from './controls';

type AtmosphereProps = ThreeElements['group'] & {
  mode: 'rain' | 'snow' | 'storm' | 'clear' | 'foggy';
  windSpeed: number;
  windDirection: number; // radians (0 = +X)
  precipitationIntensity: number;
  snowIntensity: number;
  visibility: number;
  cloudDensity: number;
  fogDensity: number;
  isThunderActive: boolean;
};

export const Atmosphere = ({
  mode,
  windSpeed,
  windDirection,
  precipitationIntensity,
  snowIntensity,
  visibility,
  cloudDensity,
  fogDensity,
  isThunderActive,
  ...groupProps
}: AtmosphereProps) => {
  const controls = useRef<WeatherControls>({
    windSpeed,
    windX: Math.cos(windDirection) * windSpeed,
    windZ: Math.sin(windDirection) * windSpeed,
    precipitationIntensity,
    snowIntensity,
    visibility,
    cloudDensity,
    fogDensity,
    isThunderActive,
    lightningFlash: 0,
  });

  const timeline = useMemo(() => gsap.timeline({ paused: true }), []);

  const updateControls = useCallback<WeatherControlsUpdater>((key, value) => {
    controls.current[key] = value;
  }, []);

  useEffect(() => {
    timeline.clear();
    timeline.to(controls.current, {
      windSpeed,
      windX: Math.cos(windDirection) * windSpeed,
      windZ: Math.sin(windDirection) * windSpeed,
      precipitationIntensity,
      snowIntensity,
      visibility,
      cloudDensity,
      fogDensity,
      duration: 1.2,
      ease: 'power2.out',
    });
    timeline.play(0);
  }, [cloudDensity, fogDensity, precipitationIntensity, snowIntensity, timeline, windDirection, windSpeed, visibility]);

  useEffect(() => {
    controls.current.isThunderActive = isThunderActive;
  }, [isThunderActive]);

  const showRain = mode === 'rain' || mode === 'storm';
  const showSnow = mode === 'snow';
  const showLightning = mode === 'storm';

  return (
    <WeatherControlsContext.Provider value={controls}>
      <WeatherControlsUpdateContext.Provider value={updateControls}>
        <group {...groupProps}>
          <Clouds />
          {showRain && <Rain />}
          {showSnow && <Snow />}
          {showLightning && <Lightning />}
          {/* Fog handled via scene.fog in parent */}
        </group>
      </WeatherControlsUpdateContext.Provider>
    </WeatherControlsContext.Provider>
  );
};
