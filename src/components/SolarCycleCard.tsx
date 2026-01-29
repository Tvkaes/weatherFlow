import type { SolarCycleData } from '@/hooks/useSolarCycle';

interface SolarCycleCardProps {
  data: SolarCycleData;
}

export const SolarCycleCard = ({ data }: SolarCycleCardProps) => (
  <div className="insight-panel" aria-label="Solar cycle tracker">
    <section className="insight-card insight-card--light">
      <div className="solar-widget">
        <div className="solar-widget__row">
          <div>
            <p className="insight-card__eyebrow">Solar cycle</p>
            <h3>Today</h3>
          </div>
          <div className="solar-widget__value">
            <span>{Math.round(data.remainingLightPercent)}% light remaining</span>
            {data.daylightDurationLabel && <small>{data.daylightDurationLabel}</small>}
          </div>
        </div>
        <div
          className="solar-widget__track"
          role="img"
          aria-label={`Available daylight: ${Math.round(data.remainingLightPercent)} percent`}
        >
          <div className="solar-widget__gradient" />
          <span className="solar-widget__sun" style={{ left: `calc(${data.sunProgressPercent}% - 10px)` }} />
        </div>
        <div className="solar-widget__labels">
          <div>
            <span>Sunrise</span>
            <strong>{data.sunriseLabel}</strong>
          </div>
          <div>
            <span>Now</span>
            <strong>{data.nowLabel}</strong>
          </div>
          <div>
            <span>Sunset</span>
            <strong>{data.sunsetLabel}</strong>
          </div>
        </div>
        {!data.isAvailable && (
          <p className="solar-widget__empty">Solar information not available.</p>
        )}
      </div>
    </section>
  </div>
);
