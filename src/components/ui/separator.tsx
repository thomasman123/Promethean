"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

interface SeparatorProps extends React.ComponentProps<typeof SeparatorPrimitive.Root> {
  variant?: "default" | "subtle" | "strong";
}

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: SeparatorProps) {
  const variantStyles = {
    default: "bg-zinc-200 dark:bg-zinc-800",
    subtle: "bg-zinc-100 dark:bg-zinc-900",
    strong: "bg-zinc-300 dark:bg-zinc-700"
  };

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 transition-colors",
        variantStyles[variant],
        orientation === "horizontal" 
          ? "h-px w-full" 
          : "h-full w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
