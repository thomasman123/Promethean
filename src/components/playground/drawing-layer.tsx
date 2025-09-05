'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Point {
  x: number
  y: number
}

interface DrawingLayerProps {
  isActive: boolean
  zoom: number
  pan: { x: number; y: number }
  color: string
  onPathComplete: (path: string, bounds: { x: number; y: number; width: number; height: number }) => void
}

export function DrawingLayer({ isActive, zoom, pan, color, onPathComplete }: DrawingLayerProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  // Coordinate conversion adapted for zoom system
  const pointerEventToCanvasPoint = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    
    // Get position relative to canvas center (like InfiniteCanvas)
    const centerX = (e.clientX - rect.left) - rect.width / 2
    const centerY = (e.clientY - rect.top) - rect.height / 2
    
    // Apply inverse transform: scale(zoom) translate(pan.x, pan.y)
    // Inverse: translate(-pan.x, -pan.y) scale(1/zoom)
    return {
      x: centerX / zoom - pan.x,
      y: centerY / zoom - pan.y
    }
  }, [zoom, pan])

  // Create SVG path from points
  const createPathFromPoints = (points: Point[]) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }
    
    return path
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive || e.button !== 0) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const point = pointerEventToCanvasPoint(e)
    setIsDrawing(true)
    setCurrentPoints([point])
  }, [isActive, pointerEventToCanvasPoint])

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!isDrawing || !isActive) return
    
    const point = pointerEventToCanvasPoint(e)
    setCurrentPoints(prev => [...prev, point])
  }, [isDrawing, isActive, pointerEventToCanvasPoint])

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false)
      setCurrentPoints([])
      return
    }
    
    // Calculate bounding box
    let minX = currentPoints[0].x
    let minY = currentPoints[0].y
    let maxX = currentPoints[0].x
    let maxY = currentPoints[0].y
    
    currentPoints.forEach(point => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
    
    // Add padding
    const padding = 5
    const bounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding
    }
    
    // Create path relative to bounds
    const relativePoints = currentPoints.map(point => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y
    }))
    
    const path = createPathFromPoints(relativePoints)
    
    // Clear state
    setIsDrawing(false)
    setCurrentPoints([])
    
    // Create the drawing element
    onPathComplete(path, bounds)
  }, [isDrawing, currentPoints, onPathComplete])

  // Global pointer event handlers
  useEffect(() => {
    if (!isDrawing) return

    const handleGlobalPointerMove = (e: PointerEvent) => handlePointerMove(e)
    const handleGlobalPointerUp = () => handlePointerUp()
    
    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)
    document.addEventListener('pointercancel', handleGlobalPointerUp)
    
    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
      document.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [isDrawing, handlePointerMove, handlePointerUp])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setCurrentPoints([])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing])

  // Clean up when tool becomes inactive
  useEffect(() => {
    if (!isActive && isDrawing) {
      setIsDrawing(false)
      setCurrentPoints([])
    }
  }, [isActive, isDrawing])

  if (!isActive) return null

  return (
    <div
      ref={canvasRef}
      className={cn("absolute inset-0", "pointer-events-auto")}
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      {/* SVG with transform matching InfiniteCanvas coordinate system */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={`translate(${(canvasRef.current?.clientWidth || 1000) / 2}, ${(canvasRef.current?.clientHeight || 1000) / 2}) scale(${zoom}) translate(${pan.x}, ${pan.y})`}
        >
          {/* Drawing preview */}
          {isDrawing && currentPoints.length > 0 && (
            <path
              d={createPathFromPoints(currentPoints)}
              fill="none"
              stroke={color}
              strokeWidth={2 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>
    </div>
  )
} 