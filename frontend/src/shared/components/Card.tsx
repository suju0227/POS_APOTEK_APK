import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={`rounded-xl border border-slate-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
      {...props}
    />
  );
}
