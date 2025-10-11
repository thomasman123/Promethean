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
        "p-1",
        className
      )}
    >
      {/* Inner content container with clean background */}
      <div className="rounded-lg bg-background/95 h-full overflow-hidden">
        {(title || description) && (
          <div className="px-6 py-4 border-b border-border/30">
            {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

