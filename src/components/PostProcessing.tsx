import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { useWeatherStore } from '../store/weatherStore';

export const PostProcessing = () => {
  const { atmosphere, normalized } = useWeatherStore();

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={atmosphere.bloomIntensity}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <Vignette
        darkness={0.4 + normalized.stormIntensity * 0.3}
        offset={0.3}
      />
    </EffectComposer>
  );
};
