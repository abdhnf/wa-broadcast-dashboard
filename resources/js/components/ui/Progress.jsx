import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

export function Progress({ className = '', value = 0, ...props }) {
  return (
    <ProgressPrimitive.Root
      className={`relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
