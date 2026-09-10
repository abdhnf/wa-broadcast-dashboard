import React from 'react';

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
