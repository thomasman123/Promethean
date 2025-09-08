"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WidgetProps {
  title?: string
  children: ReactNode
  className?: string
  onRemove?: () => void
}

export function Widget({ title, children, className, onRemove }: WidgetProps) {
  return (
    <div className={cn(
      "h-full rounded-lg bg-muted/50 p-6",
      "border border-border/30",
      "backdrop-blur-sm",
      "relative group",
      className
    )}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {title}
        </h3>
      )}
      
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      
      <div className="h-full">
        {children}
      </div>
    </div>
  )
} 