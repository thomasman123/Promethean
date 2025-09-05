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
  const [worldPoints, setWorldPoints] = useState<Point[]>([])

  // Convert screen (client) coordinates to world coordinates (inverse of InfiniteCanvas transform)
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const centeredX = localX - rect.width / 2
    const centeredY = localY - rect.height / 2
    return {
      x: centeredX / zoom - pan.x,
      y: centeredY / zoom - pan.y
    }
  }, [zoom, pan])

  // Convert world coordinates to local screen coordinates (relative to canvasRef top-left)
  const worldToLocalScreen = useCallback((worldX: number, worldY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const centeredX = (worldX + pan.x) * zoom
    const centeredY = (worldY + pan.y) * zoom
    return {
      x: centeredX + rect.width / 2,
      y: centeredY + rect.height / 2
    }
  }, [zoom, pan])

  // Build an SVG path string from an array of screen-local points
  const buildScreenPath = useCallback((points: Point[]) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }
    return d
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const w = screenToWorld(e.clientX, e.clientY)
    setIsDrawing(true)
    setWorldPoints([w])
  }, [isActive, screenToWorld])

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!isDrawing || !isActive) return
    const w = screenToWorld(e.clientX, e.clientY)
    setWorldPoints(prev => [...prev, w])
  }, [isDrawing, isActive, screenToWorld])

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || worldPoints.length < 2) {
      setIsDrawing(false)
      setWorldPoints([])
      return
    }

    // Compute bounds in world space
    let minX = worldPoints[0].x
    let minY = worldPoints[0].y
    let maxX = worldPoints[0].x
    let maxY = worldPoints[0].y
    for (const p of worldPoints) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    const padding = 5
    const bounds = {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2
    }

    // Convert world points to element-local coordinates
    const localPoints = worldPoints.map(p => ({ x: p.x - bounds.x, y: p.y - bounds.y }))
    const path = buildScreenPath(localPoints)

    setIsDrawing(false)
    setWorldPoints([])

    onPathComplete(path, bounds)
  }, [isDrawing, worldPoints, buildScreenPath, onPathComplete])

  // Global pointer listeners while drawing
  useEffect(() => {
    if (!isDrawing) return
    const move = (e: PointerEvent) => handlePointerMove(e)
    const up = () => handlePointerUp()
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
    }
  }, [isDrawing, handlePointerMove, handlePointerUp])

  // Escape cancels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setWorldPoints([])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDrawing])

  // Deactivate cleanup
  useEffect(() => {
    if (!isActive && isDrawing) {
      setIsDrawing(false)
      setWorldPoints([])
    }
  }, [isActive, isDrawing])

  if (!isActive) return null

  // Build preview path in screen space (no transforms)
  const previewScreenPoints = worldPoints.map(p => worldToLocalScreen(p.x, p.y))
  const previewPath = buildScreenPath(previewScreenPoints)

  return (
    <div
      ref={canvasRef}
      className={cn("absolute inset-0", "pointer-events-auto")}
      style={{ cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {isDrawing && previewPath && (
          <path
            d={previewPath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
} 