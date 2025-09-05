'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TransformHandlesProps {
  element: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
  }
  zoom: number
  onTransform: (updates: {
    x?: number
    y?: number
    width?: number
    height?: number
    rotation?: number
  }) => void
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate'

export function TransformHandles({ element, zoom, onTransform }: TransformHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [elementStart, setElementStart] = useState({
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation || 0
  })

  const handleSize = 8 / zoom
  const rotateHandleDistance = 30 / zoom

  const handles: { type: HandleType; cursor: string; x: number; y: number }[] = [
    { type: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
    { type: 'n', cursor: 'n-resize', x: element.width / 2, y: 0 },
    { type: 'ne', cursor: 'ne-resize', x: element.width, y: 0 },
    { type: 'e', cursor: 'e-resize', x: element.width, y: element.height / 2 },
    { type: 'se', cursor: 'se-resize', x: element.width, y: element.height },
    { type: 's', cursor: 's-resize', x: element.width / 2, y: element.height },
    { type: 'sw', cursor: 'sw-resize', x: 0, y: element.height },
    { type: 'w', cursor: 'w-resize', x: 0, y: element.height / 2 },
    { type: 'rotate', cursor: 'grab', x: element.width / 2, y: -rotateHandleDistance }
  ]

  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: HandleType) => {
    e.stopPropagation()
    setActiveHandle(handleType)
    setDragStart({ x: e.clientX, y: e.clientY })
    setElementStart({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0
    })
  }, [element])

  useEffect(() => {
    if (!activeHandle) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom

      if (activeHandle === 'rotate') {
        // Calculate rotation
        const centerX = elementStart.x + elementStart.width / 2
        const centerY = elementStart.y + elementStart.height / 2
        
        const startAngle = Math.atan2(
          dragStart.y / zoom - centerY,
          dragStart.x / zoom - centerX
        )
        const currentAngle = Math.atan2(
          e.clientY / zoom - centerY,
          e.clientX / zoom - centerX
        )
        
        const rotation = (currentAngle - startAngle) * (180 / Math.PI)
        onTransform({ rotation: elementStart.rotation + rotation })
      } else {
        // Handle resize
        let newX = elementStart.x
        let newY = elementStart.y
        let newWidth = elementStart.width
        let newHeight = elementStart.height

        const aspectRatio = elementStart.width / elementStart.height
        const maintainAspect = e.shiftKey

        switch (activeHandle) {
          case 'nw':
            newX = elementStart.x + dx
            newY = elementStart.y + dy
            newWidth = elementStart.width - dx
            newHeight = elementStart.height - dy
            if (maintainAspect) {
              newHeight = newWidth / aspectRatio
              newY = elementStart.y + elementStart.height - newHeight
            }
            break
          case 'n':
            newY = elementStart.y + dy
            newHeight = elementStart.height - dy
            break
          case 'ne':
            newY = elementStart.y + dy
            newWidth = elementStart.width + dx
            newHeight = elementStart.height - dy
            if (maintainAspect) {
              newHeight = newWidth / aspectRatio
              newY = elementStart.y + elementStart.height - newHeight
            }
            break
          case 'e':
            newWidth = elementStart.width + dx
            break
          case 'se':
            newWidth = elementStart.width + dx
            newHeight = elementStart.height + dy
            if (maintainAspect) {
              newHeight = newWidth / aspectRatio
            }
            break
          case 's':
            newHeight = elementStart.height + dy
            break
          case 'sw':
            newX = elementStart.x + dx
            newWidth = elementStart.width - dx
            newHeight = elementStart.height + dy
            if (maintainAspect) {
              newHeight = newWidth / aspectRatio
            }
            break
          case 'w':
            newX = elementStart.x + dx
            newWidth = elementStart.width - dx
            break
        }

        // Minimum size constraints
        if (newWidth < 20) {
          newWidth = 20
          newX = elementStart.x + elementStart.width - 20
        }
        if (newHeight < 20) {
          newHeight = 20
          newY = elementStart.y + elementStart.height - 20
        }

        onTransform({ x: newX, y: newY, width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setActiveHandle(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeHandle, dragStart, elementStart, zoom, onTransform])

  return (
    <g transform={`translate(${element.x}, ${element.y}) rotate(${element.rotation || 0} ${element.width / 2} ${element.height / 2})`}>
      {/* Rotation handle line */}
      <line
        x1={element.width / 2}
        y1={0}
        x2={element.width / 2}
        y2={-rotateHandleDistance + handleSize}
        stroke="hsl(var(--primary))"
        strokeWidth={1 / zoom}
      />

      {/* Handles */}
      {handles.map(handle => (
        <rect
          key={handle.type}
          x={handle.x - handleSize / 2}
          y={handle.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="hsl(var(--primary))"
          stroke="white"
          strokeWidth={1 / zoom}
          style={{ cursor: handle.cursor }}
          onMouseDown={(e) => handleMouseDown(e, handle.type)}
          className="hover:scale-125 transition-transform"
          rx={handle.type === 'rotate' ? handleSize / 2 : 0}
        />
      ))}
    </g>
  )
} 