import { ForecastSection } from '@/components/ForecastSection';

export const ForecastPanel = () => (
  <section aria-labelledby="forecast-heading">
    <h2 id="forecast-heading" className="section-heading">
      Forecast insight
    </h2>
    <ForecastSection />
  </section>
);
