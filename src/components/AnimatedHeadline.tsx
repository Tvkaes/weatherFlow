import { forwardRef } from 'react';

interface AnimatedHeadlineProps {
  text: string;
}

export const AnimatedHeadline = forwardRef<HTMLHeadingElement, AnimatedHeadlineProps>(
  ({ text }, ref) => (
    <h1 ref={ref} className="headline-text">
      {text}
    </h1>
  )
);

AnimatedHeadline.displayName = 'AnimatedHeadline';
