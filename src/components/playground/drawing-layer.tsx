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
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [previewPath, setPreviewPath] = useState<string>('')

  // BULLETPROOF coordinate conversion - exactly matching InfiniteCanvas
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    
    // Step 1: Convert to canvas-relative coordinates (0,0 at top-left of canvas)
    const canvasX = clientX - rect.left
    const canvasY = clientY - rect.top
    
    // Step 2: Convert to center-relative coordinates (0,0 at center of canvas)
    const centerX = canvasX - rect.width / 2
    const centerY = canvasY - rect.height / 2
    
    // Step 3: Apply inverse transform - EXACTLY like InfiniteCanvas does
    // InfiniteCanvas transform: scale(zoom) translate(pan.x, pan.y) with center origin
    // Inverse: translate(-pan.x, -pan.y) scale(1/zoom)
    const worldX = centerX / zoom - pan.x
    const worldY = centerY / zoom - pan.y
    
    return { x: worldX, y: worldY }
  }, [zoom, pan])

  // Convert world coordinates back to screen coordinates for verification
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    
    // Apply forward transform: scale(zoom) translate(pan.x, pan.y)
    const centerX = (worldX + pan.x) * zoom
    const centerY = (worldY + pan.y) * zoom
    
    // Convert from center-relative to canvas-relative
    const canvasX = centerX + rect.width / 2
    const canvasY = centerY + rect.height / 2
    
    // Convert to screen coordinates
    const screenX = canvasX + rect.left
    const screenY = canvasY + rect.top
    
    return { x: screenX, y: screenY }
  }, [zoom, pan])

  // Create smooth path from points
  const createSmoothPath = (points: Point[]) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

    let path = `M ${points[0].x} ${points[0].y}`
    
    // Use quadratic curves for smoothness
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]
      
      // Control point is the current point
      const cpX = curr.x
      const cpY = curr.y
      
      // End point is midway to next point
      const endX = (curr.x + next.x) / 2
      const endY = (curr.y + next.y) / 2
      
      path += ` Q ${cpX} ${cpY} ${endX} ${endY}`
    }
    
    // Final line to last point
    const lastPoint = points[points.length - 1]
    path += ` L ${lastPoint.x} ${lastPoint.y}`
    
    return path
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive || e.button !== 0) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const worldPoint = screenToWorld(e.clientX, e.clientY)
    setIsDrawing(true)
    setCurrentPath([worldPoint])
    setPreviewPath(`M ${worldPoint.x} ${worldPoint.y}`)
  }, [isActive, screenToWorld])

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!isDrawing || !isActive) return
    
    // Check if still drawing
    if (e.buttons !== 1) {
      setIsDrawing(false)
      setCurrentPath([])
      setPreviewPath('')
      return
    }
    
    const worldPoint = screenToWorld(e.clientX, e.clientY)
    const newPath = [...currentPath, worldPoint]
    setCurrentPath(newPath)
    setPreviewPath(createSmoothPath(newPath))
  }, [isDrawing, isActive, currentPath, screenToWorld])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false)
      setCurrentPath([])
      setPreviewPath('')
      return
    }
    
    // Calculate bounding box in world coordinates
    let minX = currentPath[0].x
    let minY = currentPath[0].y
    let maxX = currentPath[0].x
    let maxY = currentPath[0].y
    
    currentPath.forEach(point => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
    
    // Add padding for stroke
    const padding = 3
    const bounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding
    }
    
    // Create path relative to bounds
    const relativePath = currentPath.map(point => ({
      x: point.x - bounds.x,
      y: point.y - bounds.y
    }))
    
    const finalPath = createSmoothPath(relativePath)
    
    // Clear state
    setIsDrawing(false)
    setCurrentPath([])
    setPreviewPath('')
    
    // Create the drawing element
    onPathComplete(finalPath, bounds)
  }, [isDrawing, currentPath, onPathComplete])

  // Global mouse event handlers
  useEffect(() => {
    if (!isDrawing) return

    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e)
    const handleGlobalMouseUp = () => handleMouseUp()
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mouseleave', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mouseleave', handleGlobalMouseUp)
    }
  }, [isDrawing, handleMouseMove, handleMouseUp])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setCurrentPath([])
        setPreviewPath('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing])

  // Clean up when tool becomes inactive
  useEffect(() => {
    if (!isActive && isDrawing) {
      setIsDrawing(false)
      setCurrentPath([])
      setPreviewPath('')
    }
  }, [isActive, isDrawing])

  if (!isActive) return null

  return (
    <div
      ref={canvasRef}
      className={cn("absolute inset-0", "pointer-events-auto")}
      style={{ cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
    >
             {/* Use a div with CSS transform instead of SVG - matches InfiniteCanvas exactly */}
       <div
         className="absolute inset-0 pointer-events-none"
         style={{
           transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
           transformOrigin: 'center center'
         }}
       >
         {/* SVG with centered coordinate system */}
         <svg
           className="absolute inset-0 w-full h-full"
           style={{ overflow: 'visible' }}
         >
           <g transform={`translate(${(canvasRef.current?.clientWidth || 1000) / 2}, ${(canvasRef.current?.clientHeight || 1000) / 2})`}>
             {isDrawing && previewPath && (
               <path
                 d={previewPath}
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
    </div>
  )
} 