"use client"

import { cn } from "@/lib/utils"

interface GradientCardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function GradientCard({ children, className, title, description }: GradientCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-gradient-to-br from-muted/40 via-muted/20 to-background/50",
        "border border-border/40",
        "shadow-sm",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Header - part of gradient frame */}
      {(title || description) && (
        <div className="px-6 py-4">
          {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Inner content container with clean background */}
      <div className={cn(
        "bg-background/95 overflow-hidden",
        title || description ? "rounded-b-xl" : "rounded-xl",
        "p-6"
      )}>
        {children}
      </div>
    </div>
  )
}

