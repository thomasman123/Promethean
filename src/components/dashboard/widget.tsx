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
      "h-full w-full rounded-lg bg-card border shadow-sm",
      "relative group flex flex-col overflow-hidden",
      className
    )}>
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-medium truncate pr-8">
            {title}
          </h3>
        </div>
      )}
      
      {/* Remove button */}
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
      
      {/* Content */}
      <div className="flex-1 p-4 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
} 