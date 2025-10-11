"use client"

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'

export interface ShapeNodeData {
  shape: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'hexagon'
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  text?: string
}

export const CanvasShapeNode = memo(({ data, selected }: NodeProps<ShapeNodeData>) => {
  const { shape, fill, stroke, strokeWidth, opacity, text } = data

  const renderShape = () => {
    const style = {
      fill,
      stroke,
      strokeWidth,
      opacity,
    }

    switch (shape) {
      case 'circle':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="50" cy="50" r="48" {...style} />
            </svg>
            {text && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-2">
                <span style={{ color: stroke }}>{text}</span>
              </div>
            )}
          </div>
        )
      case 'triangle':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="50,10 90,90 10,90" {...style} />
            </svg>
            {text && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-2 pt-6">
                <span style={{ color: stroke }}>{text}</span>
              </div>
            )}
          </div>
        )
      case 'diamond':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="50,10 90,50 50,90 10,50" {...style} />
            </svg>
            {text && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-2">
                <span style={{ color: stroke }}>{text}</span>
              </div>
            )}
          </div>
        )
      case 'hexagon':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="25,10 75,10 95,50 75,90 25,90 5,50" {...style} />
            </svg>
            {text && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-2">
                <span style={{ color: stroke }}>{text}</span>
              </div>
            )}
          </div>
        )
      default: // rectangle
        return (
          <div
            className="w-full h-full rounded flex items-center justify-center"
            style={{ backgroundColor: fill, border: `${strokeWidth}px solid ${stroke}`, opacity }}
          >
            {text && (
              <div className="text-center px-2">
                <span style={{ color: stroke }}>{text}</span>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="relative w-full h-full">
      <NodeResizer
        color={selected ? "#3b82f6" : "transparent"}
        isVisible={selected}
        minWidth={50}
        minHeight={50}
      />
      {renderShape()}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
})

CanvasShapeNode.displayName = 'CanvasShapeNode'

