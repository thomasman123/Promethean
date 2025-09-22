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
      
      {/* Menu button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
      
      {/* Content */}
      <div className={cn(
        "flex-1 min-h-0 overflow-hidden",
        reducedPadding ? "p-1" : "p-4"
      )}>
        {children}
      </div>
    </div>
  )
} 