'use client'

import { useEffect, useState } from 'react'
import { CanvasElementData } from './canvas-element'

interface SnapGuidesProps {
  elements: CanvasElementData[]
  activeElement: CanvasElementData | null
  zoom: number
  pan: { x: number; y: number }
}

interface SnapLine {
  type: 'vertical' | 'horizontal'
  position: number
}

export function SnapGuides({ elements, activeElement, zoom, pan }: SnapGuidesProps) {
  const [snapLines, setSnapLines] = useState<SnapLine[]>([])

  useEffect(() => {
    if (!activeElement) {
      setSnapLines([])
      return
    }

    const threshold = 5 / zoom // 5 pixel snap threshold
    const lines: SnapLine[] = []

    // Get active element bounds
    const activeLeft = activeElement.x
    const activeRight = activeElement.x + (activeElement.width || 100)
    const activeTop = activeElement.y
    const activeBottom = activeElement.y + (activeElement.height || 100)
    const activeCenterX = activeElement.x + (activeElement.width || 100) / 2
    const activeCenterY = activeElement.y + (activeElement.height || 100) / 2

    // Check against other elements
    elements.forEach(element => {
      if (element.id === activeElement.id) return

      const left = element.x
      const right = element.x + (element.width || 100)
      const top = element.y
      const bottom = element.y + (element.height || 100)
      const centerX = element.x + (element.width || 100) / 2
      const centerY = element.y + (element.height || 100) / 2

      // Vertical alignment checks
      if (Math.abs(activeLeft - left) < threshold) {
        lines.push({ type: 'vertical', position: left })
      }
      if (Math.abs(activeLeft - right) < threshold) {
        lines.push({ type: 'vertical', position: right })
      }
      if (Math.abs(activeRight - left) < threshold) {
        lines.push({ type: 'vertical', position: left })
      }
      if (Math.abs(activeRight - right) < threshold) {
        lines.push({ type: 'vertical', position: right })
      }
      if (Math.abs(activeCenterX - centerX) < threshold) {
        lines.push({ type: 'vertical', position: centerX })
      }

      // Horizontal alignment checks
      if (Math.abs(activeTop - top) < threshold) {
        lines.push({ type: 'horizontal', position: top })
      }
      if (Math.abs(activeTop - bottom) < threshold) {
        lines.push({ type: 'horizontal', position: bottom })
      }
      if (Math.abs(activeBottom - top) < threshold) {
        lines.push({ type: 'horizontal', position: top })
      }
      if (Math.abs(activeBottom - bottom) < threshold) {
        lines.push({ type: 'horizontal', position: bottom })
      }
      if (Math.abs(activeCenterY - centerY) < threshold) {
        lines.push({ type: 'horizontal', position: centerY })
      }
    })

    // Remove duplicates
    const uniqueLines = lines.filter((line, index, self) =>
      index === self.findIndex(l => l.type === line.type && l.position === line.position)
    )

    setSnapLines(uniqueLines)
  }, [activeElement, elements, zoom])

  if (snapLines.length === 0) return null

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      <g transform={`translate(${window.innerWidth / 2}, ${window.innerHeight / 2}) scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
        {snapLines.map((line, index) => (
          <line
            key={index}
            x1={line.type === 'vertical' ? line.position : -10000}
            y1={line.type === 'horizontal' ? line.position : -10000}
            x2={line.type === 'vertical' ? line.position : 10000}
            y2={line.type === 'horizontal' ? line.position : 10000}
            stroke="hsl(var(--primary))"
            strokeWidth={1 / zoom}
            strokeDasharray={`${5 / zoom} ${5 / zoom}`}
            opacity={0.5}
          />
        ))}
      </g>
    </svg>
  )
}

export function snapToGuides(
  position: { x: number; y: number },
  width: number,
  height: number,
  elements: CanvasElementData[],
  activeElementId: string,
  snapDistance: number = 5
): { x: number; y: number; snapped: boolean } {
  let snappedX = position.x
  let snappedY = position.y
  let didSnap = false

  const activeLeft = position.x
  const activeRight = position.x + width
  const activeTop = position.y
  const activeBottom = position.y + height
  const activeCenterX = position.x + width / 2
  const activeCenterY = position.y + height / 2

  elements.forEach(element => {
    if (element.id === activeElementId) return

    const left = element.x
    const right = element.x + (element.width || 100)
    const top = element.y
    const bottom = element.y + (element.height || 100)
    const centerX = element.x + (element.width || 100) / 2
    const centerY = element.y + (element.height || 100) / 2

    // Vertical snapping
    if (Math.abs(activeLeft - left) < snapDistance) {
      snappedX = left
      didSnap = true
    } else if (Math.abs(activeLeft - right) < snapDistance) {
      snappedX = right
      didSnap = true
    } else if (Math.abs(activeRight - left) < snapDistance) {
      snappedX = left - width
      didSnap = true
    } else if (Math.abs(activeRight - right) < snapDistance) {
      snappedX = right - width
      didSnap = true
    } else if (Math.abs(activeCenterX - centerX) < snapDistance) {
      snappedX = centerX - width / 2
      didSnap = true
    }

    // Horizontal snapping
    if (Math.abs(activeTop - top) < snapDistance) {
      snappedY = top
      didSnap = true
    } else if (Math.abs(activeTop - bottom) < snapDistance) {
      snappedY = bottom
      didSnap = true
    } else if (Math.abs(activeBottom - top) < snapDistance) {
      snappedY = top - height
      didSnap = true
    } else if (Math.abs(activeBottom - bottom) < snapDistance) {
      snappedY = bottom - height
      didSnap = true
    } else if (Math.abs(activeCenterY - centerY) < snapDistance) {
      snappedY = centerY - height / 2
      didSnap = true
    }
  })

  return { x: snappedX, y: snappedY, snapped: didSnap }
} 