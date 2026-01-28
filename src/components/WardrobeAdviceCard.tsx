import { forwardRef } from 'react';

interface WardrobeAdviceCardProps {
  adviceParagraphs: string[];
  adviceText: string;
  isLoading: boolean;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const WardrobeAdviceCard = forwardRef<HTMLDivElement, WardrobeAdviceCardProps>(function WardrobeAdviceCard(
  { adviceParagraphs, adviceText, isLoading, className, showCloseButton = false, onClose },
  ref
) {
  const classes = ['wardrobe-card', className].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes}>
      <header className="wardrobe-card__header">
        <div>
          <p className="wardrobe-card__eyebrow">Asistente de estilo</p>
          <h3>Consejo para hoy</h3>
        </div>
        {showCloseButton && onClose ? (
          <button type="button" className="wardrobe-card__close" onClick={onClose}>
            ×
          </button>
        ) : null}
      </header>

      <div className="wardrobe-card__body">
        {isLoading ? (
          <p className="wardrobe-card__loading">Generando consejo...</p>
        ) : adviceParagraphs.length === 0 ? (
          <p>{adviceText}</p>
        ) : (
          adviceParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        )}
      </div>
    </div>
  );
});
