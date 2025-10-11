"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MoreVertical, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface WidgetProps {
  title?: string
  children: ReactNode
  className?: string
  onRemove?: () => void
  onEdit?: () => void
  reducedPadding?: boolean
}

export function Widget({ title, children, className, onRemove, onEdit, reducedPadding }: WidgetProps) {
  return (
    <div className={cn(
      "h-full w-full rounded-xl border border-border/40 shadow-sm overflow-hidden",
      "bg-gradient-to-br from-muted/40 via-muted/20 to-background/50",
      "backdrop-blur-sm",
      "relative group flex flex-col",
      className
    )}>
      {/* Menu button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onEdit && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Header - part of gradient frame */}
      {title && (
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium truncate pr-8">
            {title}
          </h3>
        </div>
      )}

      {/* Inner content container - clean background */}
      <div className={cn(
        "flex-1 min-h-0 overflow-hidden",
        "rounded-b-lg bg-background/95",
        title && "rounded-t-none"
      )}>
        <div className={cn(
          "h-full overflow-hidden",
          reducedPadding ? "p-1" : "p-4"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
} 