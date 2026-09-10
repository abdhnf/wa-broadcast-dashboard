import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-zinc-800 bg-zinc-900 text-zinc-300",
        secondary:
          "border-transparent bg-zinc-800 text-zinc-300",
        success:
          "border-emerald-500/20 bg-emerald-950/50 text-emerald-300",
        warning:
          "border-amber-500/20 bg-amber-950/50 text-amber-300",
        destructive:
          "border-rose-500/20 bg-rose-950/50 text-rose-300",
        outline:
          "border-zinc-800 text-zinc-400",
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
