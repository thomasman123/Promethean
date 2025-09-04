"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface WidgetProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Widget({ title, children, className }: WidgetProps) {
  return (
    <div className={cn(
      "h-full rounded-lg bg-muted/50 p-6",
      "border border-border/30",
      "backdrop-blur-sm",
      className
    )}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {title}
        </h3>
      )}
      <div className="h-full">
        {children}
      </div>
    </div>
  )
} 