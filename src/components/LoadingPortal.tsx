import { motion } from 'framer-motion';

export const LoadingPortal = () => (
  <div className="loading-portal" role="status" aria-live="polite" aria-label="Loading weather data">
    <motion.div
      className="portal-core"
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
    <div className="portal-tunnel-layer portal-tunnel-layer--one" />
    <div className="portal-tunnel-layer portal-tunnel-layer--two" />
    <div className="portal-tunnel-layer portal-tunnel-layer--three" />
  </div>
);
