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
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [previewPath, setPreviewPath] = useState<string>('')

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    
    const rect = svgRef.current.getBoundingClientRect()
    // Get position relative to canvas center
    const relativeX = screenX - rect.left - rect.width / 2
    const relativeY = screenY - rect.top - rect.height / 2
    
    // Apply zoom and pan inverse transform
    const x = relativeX / zoom - pan.x
    const y = relativeY / zoom - pan.y
    
    return { x, y }
  }, [zoom, pan])

  // Smooth path using Catmull-Rom spline
  const smoothPath = (points: Point[]) => {
    if (points.length < 2) return ''
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    }

    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2]
      
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    
    // Handle last segment
    const lastIndex = points.length - 1
    path += ` L ${points[lastIndex].x} ${points[lastIndex].y}`
    
    return path
  }

  // Calculate bounds of path
  const getPathBounds = (points: Point[]) => {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    
    let minX = points[0].x
    let minY = points[0].y
    let maxX = points[0].x
    let maxY = points[0].y
    
    points.forEach(p => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })
    
    return {
      x: minX - 5,
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return
    
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setIsDrawing(true)
    setCurrentPath([worldPos])
    setPreviewPath(`M ${worldPos.x} ${worldPos.y}`)
  }, [isActive, screenToWorld])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isActive) return
    
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const newPath = [...currentPath, worldPos]
    setCurrentPath(newPath)
    
    // Update preview with smoothed path
    setPreviewPath(smoothPath(newPath))
  }, [isDrawing, isActive, currentPath, screenToWorld])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false)
      setCurrentPath([])
      setPreviewPath('')
      return
    }
    
    const bounds = getPathBounds(currentPath)
    
    // Convert path to be relative to bounds
    const relativePath = currentPath.map(p => ({
      x: p.x - bounds.x,
      y: p.y - bounds.y
    }))
    
    const finalPath = smoothPath(relativePath)
    
    onPathComplete(finalPath, bounds)
    
    setIsDrawing(false)
    setCurrentPath([])
    setPreviewPath('')
  }, [isDrawing, currentPath, onPathComplete])

  // Handle escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setCurrentPath([])
        setPreviewPath('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing])

  // Add global mouse up listener
  useEffect(() => {
    if (isDrawing) {
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('mouseleave', handleMouseUp)
      
      return () => {
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('mouseleave', handleMouseUp)
      }
    }
  }, [isDrawing, handleMouseUp])

  if (!isActive) return null

  return (
    <div
      className={cn("absolute inset-0", isActive ? "pointer-events-auto" : "pointer-events-none")}
      style={{ cursor: isActive ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
      {/* Transform group to handle pan/zoom */}
      <g transform={`translate(${svgRef.current?.clientWidth ? svgRef.current.clientWidth / 2 : 0}, ${svgRef.current?.clientHeight ? svgRef.current.clientHeight / 2 : 0}) scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
        {/* Preview path while drawing */}
        {isDrawing && previewPath && (
          <path
            d={previewPath}
            fill="none"
            stroke={color}
            strokeWidth={2 / zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}
      </g>
    </svg>
    </div>
  )
} 