import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="block" htmlFor={inputId}>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <input
          id={inputId}
          ref={ref}
          className={`h-10 w-full rounded-lg border border-slate-200/80 bg-white px-3.5 text-sm outline-none transition-all duration-200 placeholder:text-slate-400/80 focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10 focus:shadow-xs ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''
          } ${className}`}
          {...props}
        />
        {error ? <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
