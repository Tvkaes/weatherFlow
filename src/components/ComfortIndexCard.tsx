import type { ComfortIndexData } from '@/hooks/useComfortIndex';

interface ComfortIndexCardProps {
  data: ComfortIndexData;
}

export const ComfortIndexCard = ({ data }: ComfortIndexCardProps) => {
  const progress = `${Math.round(data.score * 100)}%`;

  return (
    <div className="insight-panel" aria-label="Comfort index">
      <section className="insight-card comfort-card">
        <header className="comfort-card__header">
          <div>
            <p className="insight-card__eyebrow">Comfort check</p>
            <h3>{data.levelLabel}</h3>
          </div>
          <span className={`comfort-chip comfort-chip--${data.level}`}>
            {Math.round(data.score * 100)}% neutral zone
          </span>
        </header>

        <p className="comfort-card__summary">{data.summary}</p>

        <div className="comfort-card__meter" role="img" aria-label={`Comfort score ${progress}`}>
          <div className="comfort-card__meter-track">
            <span className="comfort-card__meter-fill" style={{ width: progress }} />
          </div>
          <div className="comfort-card__meter-scale">
            <span>Cold</span>
            <span>Neutral</span>
            <span>Hot</span>
          </div>
        </div>

        <dl className="comfort-card__drivers">
          <div>
            <dt>Feels like</dt>
            <dd>{data.feelsLikeC != null ? `${data.feelsLikeC.toFixed(1)}°C` : '--'}</dd>
          </div>
          {data.drivers.map((driver) => (
            <div key={driver.label}>
              <dt>{driver.label}</dt>
              <dd>{driver.detail}</dd>
            </div>
          ))}
        </dl>

        <ul className="comfort-card__tips">
          {data.recommendations.slice(0, 2).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
