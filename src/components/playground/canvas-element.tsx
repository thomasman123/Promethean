'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Trash2, Copy, Palette, Layers } from 'lucide-react'
import { ShapeType } from './shapes-toolbar'

export interface CanvasElementData {
  id: string
  type: 'text' | 'shape' | 'widget' | 'drawing'
  x: number
  y: number
  width?: number
  height?: number
  content?: any
  color?: string
  selected?: boolean
  path?: string  // For drawing elements
}

interface CanvasElementProps {
  element: CanvasElementData
  isSelected: boolean
  onSelect: (id: string, addToSelection?: boolean) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onUpdate: (id: string, updates: Partial<CanvasElementData>) => void
  onDragStart: (id: string, startX: number, startY: number) => void
  zoom: number
}

export function CanvasElement({
  element,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdate,
  onDragStart,
  zoom
}: CanvasElementProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey
    onSelect(element.id, isMultiSelect)
    
    // Only start drag if not editing text and not about to edit
    if (!isEditing && element.type !== 'text') {
      onDragStart(element.id, e.clientX, e.clientY)
    } else if (element.type === 'text' && !isEditing) {
      // For text, only drag if already selected (prevents accidental drag when trying to edit)
      if (isSelected) {
        onDragStart(element.id, e.clientX, e.clientY)
      }
    }
  }

  const handleDoubleClick = () => {
    if (element.type === 'text') {
      setIsEditing(true)
    }
  }

  const renderShape = () => {
    if (element.type !== 'shape' || !element.content?.shapeType) return null
    
    const shapeType = element.content.shapeType as ShapeType
    const color = element.color || 'currentColor'
    const width = element.width || 100
    const height = element.height || 100

    switch (shapeType) {
      case 'rectangle':
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <rect
              x={2}
              y={2}
              width={width - 4}
              height={height - 4}
              fill="none"
              stroke={color}
              strokeWidth={2}
              rx={4}
            />
          </svg>
        )
      
      case 'circle':
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <circle
              cx={width / 2}
              cy={height / 2}
              r={Math.min(width, height) / 2 - 2}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          </svg>
        )
      
      case 'triangle':
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <polygon
              points={`${width/2},2 ${width-2},${height-2} 2,${height-2}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          </svg>
        )
      
      case 'arrow':
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <defs>
              <marker
                id={`arrowhead-${element.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={color}
                />
              </marker>
            </defs>
            <line
              x1={10}
              y1={height / 2}
              x2={width - 20}
              y2={height / 2}
              stroke={color}
              strokeWidth={2}
              markerEnd={`url(#arrowhead-${element.id})`}
            />
          </svg>
        )
      
      case 'hexagon':
        const hexPoints = []
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          const x = width / 2 + (Math.min(width, height) / 2 - 2) * Math.cos(angle)
          const y = height / 2 + (Math.min(width, height) / 2 - 2) * Math.sin(angle)
          hexPoints.push(`${x},${y}`)
        }
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <polygon
              points={hexPoints.join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          </svg>
        )
      
      case 'star':
        const starPoints = []
        const outerRadius = Math.min(width, height) / 2 - 2
        const innerRadius = outerRadius * 0.4
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const x = width / 2 + radius * Math.cos(angle - Math.PI / 2)
          const y = height / 2 + radius * Math.sin(angle - Math.PI / 2)
          starPoints.push(`${x},${y}`)
        }
        return (
          <svg width={width} height={height} className="absolute inset-0">
            <polygon
              points={starPoints.join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          </svg>
        )
      
      default:
        return null
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={elementRef}
          className={cn(
            "absolute cursor-move",
            isSelected && "ring-2 ring-primary ring-offset-2",
            element.type === 'widget' && "bg-card border rounded-lg shadow-sm"
          )}
          style={{
            left: element.x,
            top: element.y,
            width: element.width || 100,
            height: element.height || 100,
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {/* Render content based on type */}
          {element.type === 'text' && (
            <div className="p-2 w-full h-full">
              {isEditing ? (
                <textarea
                  className="w-full h-full bg-transparent border-none outline-none resize-none"
                  defaultValue={element.content || 'Text'}
                  autoFocus
                  onBlur={(e) => {
                    setIsEditing(false)
                    onUpdate(element.id, { content: e.target.value })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditing(false)
                    }
                  }}
                  style={{ fontSize: 16 / zoom }}
                />
              ) : (
                <div style={{ fontSize: 16 / zoom }}>
                  {element.content || 'Text'}
                </div>
              )}
            </div>
          )}
          
          {element.type === 'shape' && renderShape()}
          
          {element.type === 'widget' && (
            <div className="w-full h-full p-2">
              <div className="text-xs text-muted-foreground mb-1">
                {element.content?.widgetType} - {element.content?.metric}
              </div>
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                Chart Preview
              </div>
            </div>
          )}
          
          {element.type === 'drawing' && element.path && (
            <svg 
              width={element.width} 
              height={element.height} 
              className="absolute inset-0"
              style={{ overflow: 'visible' }}
            >
              <path
                d={element.path}
                fill="none"
                stroke={element.color || 'currentColor'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {/* Selection handles */}
          {isSelected && (
            <>
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDuplicate(element.id)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onUpdate(element.id, { color: '#ef4444' })}>
          <Palette className="h-4 w-4 mr-2" />
          Change Color
        </ContextMenuItem>
        <ContextMenuItem>
          <Layers className="h-4 w-4 mr-2" />
          Bring to Front
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDelete(element.id)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
} 