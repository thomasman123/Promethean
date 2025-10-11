"use client"

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PlaygroundWidget, PlaygroundWidgetConfig } from './playground-widget'

export interface CanvasElement {
  id: string
  type: 'widget' | 'shape' | 'text' | 'drawing' | 'arrow'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  data: any
  zIndex: number
}

interface CanvasSystemProps {
  elements: CanvasElement[]
  onElementsChange: (elements: CanvasElement[]) => void
  selectedTool: 'select' | 'pan' | 'draw' | 'text' | 'shape' | 'arrow'
  children?: React.ReactNode
  className?: string
}

export function CanvasSystem({ 
  elements, 
  onElementsChange, 
  selectedTool,
  children,
  className 
}: CanvasSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)

  // Pan the canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'pan' || (selectedTool === 'select' && e.target === e.currentTarget)) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y })
    }
  }, [selectedTool, viewportOffset])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStart && selectedTool === 'pan') {
      setViewportOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart, selectedTool])

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
    setDraggedElement(null)
  }, [])

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = -e.deltaY
      const zoomFactor = 1 + delta * 0.001
      setZoom(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)))
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          const newElements = elements.filter(el => !selectedIds.has(el.id))
          onElementsChange(newElements)
          setSelectedIds(new Set())
        }
      }
      // Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(new Set(elements.map(el => el.id)))
      }
      // Deselect all
      if (e.key === 'Escape') {
        setSelectedIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [elements, selectedIds, onElementsChange])

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewportOffset.x) / zoom,
      y: (screenY - viewportOffset.y) / zoom
    }
  }, [viewportOffset, zoom])

  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + viewportOffset.x,
      y: canvasY * zoom + viewportOffset.y
    }
  }, [viewportOffset, zoom])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden bg-background", className)}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      style={{ cursor: selectedTool === 'pan' ? 'grab' : 'default' }}
    >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${viewportOffset.x}px ${viewportOffset.y}px`
        }}
      />

      {/* Canvas content */}
      <div
        className="absolute"
        style={{
          transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Render elements */}
        {elements.map(element => (
          <CanvasElementRenderer
            key={element.id}
            element={element}
            isSelected={selectedIds.has(element.id)}
            onSelect={(id) => {
              if (selectedTool === 'select') {
                setSelectedIds(new Set([id]))
              }
            }}
            onUpdate={(updates) => {
              const newElements = elements.map(el =>
                el.id === element.id ? { ...el, ...updates } : el
              )
              onElementsChange(newElements)
            }}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2 bg-background/80 backdrop-blur-sm border rounded-lg p-2">
        <button
          className="px-3 py-1 hover:bg-muted rounded"
          onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
        >
          -
        </button>
        <span className="px-3 py-1 text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="px-3 py-1 hover:bg-muted rounded"
          onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
        >
          +
        </button>
        <button
          className="px-3 py-1 hover:bg-muted rounded"
          onClick={() => { setZoom(1); setViewportOffset({ x: 0, y: 0 }) }}
        >
          Reset
        </button>
      </div>

      {children}
    </div>
  )
}

interface CanvasElementRendererProps {
  element: CanvasElement
  isSelected: boolean
  onSelect: (id: string) => void
  onUpdate: (updates: Partial<CanvasElement>) => void
}

function CanvasElementRenderer({ element, isSelected, onSelect, onUpdate }: CanvasElementRendererProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(element.id)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [element.id, onSelect])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      onUpdate({
        x: element.x + dx,
        y: element.y + dy
      })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, dragStart, element, onUpdate])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setDragStart(null)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      className={cn(
        "absolute cursor-move",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        zIndex: element.zIndex
      }}
      onMouseDown={handleMouseDown}
    >
      {element.type === 'widget' && element.data && (
        <WidgetRenderer config={element.data} />
      )}

      {element.type === 'text' && (
        <div className="w-full h-full p-2 bg-transparent">
          <div className="text-sm" contentEditable suppressContentEditableWarning>
            {element.data.text || 'Text'}
          </div>
        </div>
      )}

      {element.type === 'shape' && (
        <div 
          className="w-full h-full border-2 border-primary"
          style={{
            borderRadius: element.data.shapeType === 'circle' ? '50%' : '0',
            backgroundColor: element.data.fill || 'transparent'
          }}
        />
      )}

      {/* Resize handles */}
      {isSelected && (
        <>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nesw-resize" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-nesw-resize" />
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize" />
        </>
      )}
    </div>
  )
}

function WidgetRenderer({ config }: { config: PlaygroundWidgetConfig }) {
  return (
    <div className="w-full h-full">
      <PlaygroundWidget
        config={config}
        width={undefined}
        height={undefined}
        onConfigChange={() => {}}
      />
    </div>
  )
}

