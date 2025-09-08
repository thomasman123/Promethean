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
      "h-full w-full rounded-lg bg-muted/50",
      "border border-border/30",
      "backdrop-blur-sm",
      "relative group flex flex-col",
      "overflow-hidden",
      className
    )}>
      {title && (
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </h3>
        </div>
      )}
      
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      
      <div className="flex-1 px-6 pb-4 min-h-0">
        {children}
      </div>
    </div>
  )
} 