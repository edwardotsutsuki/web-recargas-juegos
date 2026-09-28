import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  glow = false,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-[#080c14] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97] hover:-translate-y-0.5 cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 focus:ring-indigo-500 ' +
      (glow ? 'shadow-glow-primary ring-2 ring-indigo-400/40' : ''),
    secondary:
      'bg-white hover:bg-slate-100/80 text-slate-800 border border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 shadow-xs focus:ring-slate-500',
    accent:
      'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black shadow-md shadow-cyan-500/25 focus:ring-cyan-400 ' +
      (glow ? 'shadow-glow-accent ring-2 ring-cyan-300/40' : ''),
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-500/25 focus:ring-red-500 ' +
      (glow ? 'shadow-glow-danger' : ''),
    ghost:
      'bg-transparent hover:bg-slate-200/70 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 focus:ring-slate-500',
    outline:
      'border-2 border-indigo-600/70 hover:border-indigo-500 text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-white bg-transparent focus:ring-indigo-500',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
