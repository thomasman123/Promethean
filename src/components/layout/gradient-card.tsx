"use client"

import { cn } from "@/lib/utils"

interface GradientCardProps {
  children: React.ReactNode
  className?: string
}

export function GradientCard({ children, className }: GradientCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6",
        "bg-gradient-to-br from-muted/40 via-muted/20 to-background/50",
        "border border-border/40",
        "shadow-sm",
        "backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  )
}

