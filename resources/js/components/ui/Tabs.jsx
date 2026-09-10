import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className = '', ...props }) {
  return (
    <TabsPrimitive.List
      className={`inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-slate-400 ${className}`}
      {...props}
    />
  );
}

export function TabsTrigger({ className = '', ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm cursor-pointer ${className}`}
      {...props}
    />
  );
}

export function TabsContent({ className = '', ...props }) {
  return (
    <TabsPrimitive.Content
      className={`mt-3 ring-offset-background focus-visible:outline-none ${className}`}
      {...props}
    />
  );
}
