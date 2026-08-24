import type { HTMLAttributes } from 'react';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'warning' | 'danger' | 'info';
};

export function Alert({ className = '', tone = 'info', ...props }: AlertProps) {
  const tones = {
    danger: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
