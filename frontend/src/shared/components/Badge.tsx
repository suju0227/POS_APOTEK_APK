import type { HTMLAttributes, ReactNode } from 'react';

type BadgeTone = 'amber' | 'emerald' | 'red' | 'slate';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  amber: 'border-amber-500/15 bg-amber-500/8 text-amber-700',
  emerald: 'border-teal-500/15 bg-teal-500/8 text-teal-700',
  red: 'border-rose-500/15 bg-rose-500/8 text-rose-700',
  slate: 'border-slate-500/15 bg-slate-500/8 text-slate-700',
};

export function Badge({
  children,
  className = '',
  tone = 'slate',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
