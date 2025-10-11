"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Square, 
  Circle, 
  Triangle, 
  Diamond,
  Hexagon,
  Type,
  StickyNote,
  BarChart3,
  MousePointer2,
  Trash2,
  ArrowRight,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToolType = 
  | 'select' 
  | 'rectangle' 
  | 'circle' 
  | 'triangle' 
  | 'diamond' 
  | 'hexagon'
  | 'text'
  | 'sticky-note'
  | 'widget'
  | 'arrow'

interface CanvasToolbarProps {
  selectedTool: ToolType
  onToolSelect: (tool: ToolType) => void
  onDelete?: () => void
  onShare?: () => void
  hasSelection?: boolean
}

export function CanvasToolbar({ 
  selectedTool, 
  onToolSelect, 
  onDelete, 
  onShare,
  hasSelection 
}: CanvasToolbarProps) {
  const tools = [
    { id: 'select' as ToolType, icon: MousePointer2, label: 'Select' },
    { id: 'rectangle' as ToolType, icon: Square, label: 'Rectangle' },
    { id: 'circle' as ToolType, icon: Circle, label: 'Circle' },
    { id: 'triangle' as ToolType, icon: Triangle, label: 'Triangle' },
    { id: 'diamond' as ToolType, icon: Diamond, label: 'Diamond' },
    { id: 'hexagon' as ToolType, icon: Hexagon, label: 'Hexagon' },
    { id: 'text' as ToolType, icon: Type, label: 'Text' },
    { id: 'sticky-note' as ToolType, icon: StickyNote, label: 'Sticky Note' },
    { id: 'widget' as ToolType, icon: BarChart3, label: 'Widget' },
    { id: 'arrow' as ToolType, icon: ArrowRight, label: 'Arrow' },
  ]

  return (
    <div className="flex items-center gap-1 p-2 bg-background border-b border-border">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-9 w-9 p-0",
              selectedTool === tool.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => onToolSelect(tool.id)}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {hasSelection && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        {onShare && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3"
            onClick={onShare}
            title="Share board"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        )}
      </div>
    </div>
  )
}

