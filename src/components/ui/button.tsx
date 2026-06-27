import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200": variant === "secondary",
            "border border-neutral-300 bg-transparent hover:bg-neutral-100 text-neutral-900": variant === "outline",
            "hover:bg-neutral-100 hover:text-neutral-900": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "bg-red-600 text-white hover:bg-red-700 hover:shadow-sm": variant === "destructive",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
