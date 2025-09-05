'use client'

import { useRef, useState, useEffect, MouseEvent, WheelEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InfiniteCanvasProps {
  children: ReactNode
  zoom: number
  pan: { x: number; y: number }
  onZoomChange: (zoom: number) => void
  onPanChange: (pan: { x: number; y: number }) => void
  className?: string
  onCanvasClick?: (e: MouseEvent, worldPos: { x: number; y: number }) => void
  isPanMode?: boolean
}

export function InfiniteCanvas({
  children,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  className,
  onCanvasClick,
  isPanMode = false
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 })

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (screenX - rect.left - rect.width / 2) / zoom - pan.x
    const y = (screenY - rect.top - rect.height / 2) / zoom - pan.y
    
    return { x, y }
  }

  // Handle mouse wheel for zoom
  const handleWheel = (e: WheelEvent) => {
    // Only zoom if Ctrl/Cmd is pressed, otherwise allow normal scroll
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      
      const delta = e.deltaY * -0.01
      const newZoom = Math.min(Math.max(0.1, zoom * (1 + delta)), 5)
      
      // Zoom towards mouse position
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const mouseX = e.clientX - rect.left - rect.width / 2
        const mouseY = e.clientY - rect.top - rect.height / 2
        
        const zoomRatio = newZoom / zoom
        const newPanX = mouseX * (1 - zoomRatio) / newZoom + pan.x * zoomRatio
        const newPanY = mouseY * (1 - zoomRatio) / newZoom + pan.y * zoomRatio
        
        onPanChange({ x: newPanX, y: newPanY })
      }
      
      onZoomChange(newZoom)
    }
  }

  // Handle mouse down for panning
  const handleMouseDown = (e: MouseEvent) => {
    // Middle mouse button or left button with shift/space
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.currentTarget.classList.contains('pan-mode')))) {
      e.preventDefault()
      setIsPanning(true)
      setStartMouse({ x: e.clientX, y: e.clientY })
      setStartPan(pan)
      document.body.style.cursor = 'grabbing'
    }
  }

  // Handle mouse move for panning
  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - startMouse.x) / zoom
      const dy = (e.clientY - startMouse.y) / zoom
      onPanChange({ x: startPan.x + dx, y: startPan.y + dy })
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Handle canvas click
  const handleClick = (e: MouseEvent) => {
    if (!isPanning && onCanvasClick) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      onCanvasClick(e, worldPos)
    }
  }

  // Add global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: any) => handleMouseMove(e)
    const handleGlobalMouseUp = () => handleMouseUp()

    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.body.style.cursor = 'grabbing'
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.body.style.cursor = 'auto'
    }
  }, [isPanning, startMouse, startPan, zoom])

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative w-full h-full overflow-hidden",
        isPanning ? "cursor-grabbing" : isPanMode ? "cursor-grab pan-mode" : "cursor-auto",
        className
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`,
          opacity: 0.5
        }}
      />
      
      {/* Canvas content */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </div>
  )
} 