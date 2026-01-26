import { motion } from 'framer-motion';

interface MetricBarProps {
  label: string;
  valueLabel: string;
  progress?: number; // 0-1
  showBar?: boolean;
}

export const MetricBar = ({ label, valueLabel, progress = 0, showBar = true }: MetricBarProps) => {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div className="weather-detail">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{valueLabel}</span>
      {showBar && (
        <div className="detail-bar">
          <motion.div
            className="detail-fill"
            initial={{ width: 0 }}
            animate={{ width: `${clamped * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
};
