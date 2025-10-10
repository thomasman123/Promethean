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
        "bg-gradient-to-br from-muted/30 to-muted/10",
        "border border-border/50",
        "shadow-sm",
        "backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  )
}

