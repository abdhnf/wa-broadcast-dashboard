import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className = '', children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={`flex h-10 w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50 text-slate-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className = '', children, position = 'popper', ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={`relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-200 shadow-xl animate-in fade-in-0 zoom-in-95 ${className}`}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className = '', children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={`relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-xs outline-none hover:bg-slate-800 focus:bg-slate-800 focus:text-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
