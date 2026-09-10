import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium font-mono border transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300",
        secondary:
          "border-slate-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400",
        success:
          "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-amber-500/20 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
        destructive:
          "border-rose-500/20 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
        outline:
          "border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
