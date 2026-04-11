import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80": variant === "default",
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80": variant === "secondary",
          "border-transparent bg-red-500 text-white hover:bg-red-500/80": variant === "destructive",
          "border-transparent bg-green-500 text-white hover:bg-green-500/80": variant === "success",
          "border-transparent bg-amber-500 text-white hover:bg-amber-500/80": variant === "warning",
          "text-neutral-950": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
