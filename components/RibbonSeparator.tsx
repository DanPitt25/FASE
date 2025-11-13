import { forwardRef } from 'react';

interface RibbonSeparatorProps {
  direction: 'left' | 'right';
  animated?: boolean;
}

const RibbonSeparator = forwardRef<HTMLDivElement, RibbonSeparatorProps>(({ 
  direction, 
  animated = false
}, ref) => {
  const animationClass = animated 
    ? direction === 'left' 
      ? 'scroll-visible-left' 
      : 'scroll-visible-right'
    : '';

  const positionClass = direction === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={ref} className="relative h-12">
      <div 
        className={`absolute ${positionClass} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${animationClass}`}
        style={{ width: '61.8%' }}
      />
    </div>
  );
});

RibbonSeparator.displayName = 'RibbonSeparator';

export default RibbonSeparator;