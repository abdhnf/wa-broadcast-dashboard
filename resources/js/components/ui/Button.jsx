import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium transition duration-150 rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs focus:ring-2 focus:ring-emerald-500/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs',
    danger: 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-800/80',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
    outline: 'border border-slate-700 bg-transparent hover:bg-slate-850 text-slate-200',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2.5 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
    icon: 'p-2',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-400 border border-amber-800/80',
    danger: 'bg-rose-950/80 text-rose-400 border border-rose-800/80',
    info: 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/80',
    gold: 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
