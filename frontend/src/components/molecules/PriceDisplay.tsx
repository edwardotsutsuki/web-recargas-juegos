import React from 'react';
import { formatCentsToCurrency } from '../../utils/currency';
import { clsx } from 'clsx';

export interface PriceDisplayProps {
  cents: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCurrencyCode?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  cents,
  currency = 'USD',
  size = 'md',
  className,
  showCurrencyCode = true,
}) => {
  const formatted = formatCentsToCurrency(cents, currency);

  const sizeClasses = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-bold',
    lg: 'text-lg font-extrabold',
    xl: 'text-2xl font-black',
  };

  return (
    <span
      className={clsx(
        'tracking-tight font-mono inline-flex items-baseline gap-1',
        sizeClasses[size],
        className
      )}
    >
      <span>{formatted}</span>
      {showCurrencyCode && (
        <span className="text-[0.65em] font-sans font-medium text-slate-400 uppercase">
          {currency}
        </span>
      )}
    </span>
  );
};

