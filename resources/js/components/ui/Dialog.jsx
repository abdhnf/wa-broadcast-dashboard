import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className = '', children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <DialogPrimitive.Content
        className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-800 bg-slate-900 p-6 shadow-2xl duration-200 sm:rounded-2xl ${className}`}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-slate-200 cursor-pointer">
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className = '', ...props }) {
  return <div className={`flex flex-col space-y-1.5 text-left ${className}`} {...props} />;
}

export function DialogTitle({ className = '', ...props }) {
  return <DialogPrimitive.Title className={`text-base font-semibold leading-none text-slate-100 ${className}`} {...props} />;
}

export function DialogDescription({ className = '', ...props }) {
  return <DialogPrimitive.Description className={`text-xs text-slate-400 ${className}`} {...props} />;
}
