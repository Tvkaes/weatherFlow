import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay = ({ isVisible, message = 'Updating weather...' }: LoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="loading-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="loading-overlay__spinner" />
      <span>{message}</span>
    </motion.div>
  );
};
