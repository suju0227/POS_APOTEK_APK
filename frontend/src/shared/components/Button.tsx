import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
};

export function Button({
  className = '',
  variant = 'primary',
  fullWidth,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-linear-to-r from-teal-600 to-emerald-600 text-white shadow-sm hover:shadow hover:from-teal-700 hover:to-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/20 active:scale-[0.98]',
    secondary: 'border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-500/10 active:scale-[0.98]',
    ghost: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]',
  };

  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-200 ease-out select-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none ${
        variants[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}
