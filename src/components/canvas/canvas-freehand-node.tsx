"use client"

import { memo } from 'react'
import { NodeProps } from 'reactflow'

export interface FreehandNodeData {
  path: string // SVG path data
  stroke: string
  strokeWidth: number
  fill?: string
}

export const CanvasFreehandNode = memo(({ data }: NodeProps<FreehandNodeData>) => {
  const { path, stroke, strokeWidth, fill } = data

  return (
    <div className="pointer-events-none">
      <svg
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        <path
          d={path}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill || 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
})

CanvasFreehandNode.displayName = 'CanvasFreehandNode'

