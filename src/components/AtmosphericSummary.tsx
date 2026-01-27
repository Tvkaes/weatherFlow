import { motion } from 'framer-motion';
import type { AtmosphericState } from '@/store/weatherStore';

interface AtmosphericSummaryProps {
  kelvinDisplay: number;
  atmosphere: AtmosphericState;
}

export const AtmosphericSummary = ({ kelvinDisplay, atmosphere }: AtmosphericSummaryProps) => (
  <motion.section
    className="atmospheric-data"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1.2 }}
    aria-label="Atmospheric data overview"
  >
    <div className="atmo-item">
      <span className="atmo-label">Color Temp</span>
      <span className="atmo-value" aria-label={`Color temperature ${kelvinDisplay} Kelvin`}>
        {kelvinDisplay}K
      </span>
    </div>
    <div className="atmo-item">
      <span className="atmo-label">Condition</span>
      <span className="atmo-value">{atmosphere.weatherCondition}</span>
    </div>
    <div className="atmo-item">
      <span className="atmo-label">Phase</span>
      <span className="atmo-value">{atmosphere.timePhase}</span>
    </div>
  </motion.section>
);
