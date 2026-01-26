interface WeatherAlertsProps {
  message: string | null;
  alertRef: React.RefObject<HTMLDivElement | null>;
  onRetry: () => void;
}

export const WeatherAlerts = ({ message, alertRef, onRetry }: WeatherAlertsProps) => {
  if (!message) return null;

  return (
    <div className="alert-card" ref={alertRef}>
      <div>
        <p className="alert-title">alerta</p>
        <p className="alert-message">{message}</p>
      </div>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
};
