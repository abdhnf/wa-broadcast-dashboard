import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "blast-badge-slate",
        brand: "blast-badge-brand",
        wa: "blast-badge-wa",
        success: "blast-badge-leaf",
        info: "blast-badge-sea",
        warning: "blast-badge-honey",
        destructive: "blast-badge-clay",
        secondary: "blast-badge-slate",
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
