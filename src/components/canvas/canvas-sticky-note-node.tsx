"use client"

import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'

export interface StickyNoteNodeData {
  text: string
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
  onTextChange?: (text: string) => void
}

const colorMap = {
  yellow: { bg: 'bg-yellow-200', border: 'border-yellow-300', shadow: 'shadow-yellow-400/50' },
  pink: { bg: 'bg-pink-200', border: 'border-pink-300', shadow: 'shadow-pink-400/50' },
  blue: { bg: 'bg-blue-200', border: 'border-blue-300', shadow: 'shadow-blue-400/50' },
  green: { bg: 'bg-green-200', border: 'border-green-300', shadow: 'shadow-green-400/50' },
  purple: { bg: 'bg-purple-200', border: 'border-purple-300', shadow: 'shadow-purple-400/50' },
}

export const CanvasStickyNoteNode = memo(({ data, selected }: NodeProps<StickyNoteNodeData>) => {
  const { text, color, onTextChange } = data
  const [localText, setLocalText] = useState(text)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const colors = colorMap[color] || colorMap.yellow

  useEffect(() => {
    setLocalText(text)
  }, [text])

  const handleBlur = () => {
    if (onTextChange && localText !== text) {
      onTextChange(localText)
    }
  }

  return (
    <div className="relative w-full h-full min-w-[150px] min-h-[150px]">
      <NodeResizer
        color={selected ? "#3b82f6" : "transparent"}
        isVisible={selected}
        minWidth={150}
        minHeight={150}
      />
      <div className={`w-full h-full ${colors.bg} ${colors.border} border-2 rounded shadow-lg ${colors.shadow} p-4`}>
        <textarea
          ref={textRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          placeholder="Type here..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
          style={{ fontFamily: 'Caveat, cursive' }}
        />
      </div>
    </div>
  )
})

CanvasStickyNoteNode.displayName = 'CanvasStickyNoteNode'

