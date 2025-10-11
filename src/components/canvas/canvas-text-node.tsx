"use client"

import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'

export interface TextNodeData {
  text: string
  fontSize: number
  fontWeight: string
  color: string
  align: 'left' | 'center' | 'right'
  onTextChange?: (text: string) => void
}

export const CanvasTextNode = memo(({ data, selected }: NodeProps<TextNodeData>) => {
  const { text, fontSize, fontWeight, color, align, onTextChange } = data
  const [isEditing, setIsEditing] = useState(false)
  const [localText, setLocalText] = useState(text)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalText(text)
  }, [text])

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (onTextChange && localText !== text) {
      onTextChange(localText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      setLocalText(text) // Reset to original
    }
  }

  return (
    <div className="relative w-full h-full min-w-[100px] min-h-[40px]">
      <NodeResizer
        color={selected ? "#3b82f6" : "transparent"}
        isVisible={selected}
        minWidth={100}
        minHeight={40}
      />
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onDoubleClick={handleDoubleClick}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={(e) => setLocalText(e.currentTarget.textContent || '')}
        className="w-full h-full p-2 outline-none cursor-text"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight,
          color,
          textAlign: align,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {localText}
      </div>
    </div>
  )
})

CanvasTextNode.displayName = 'CanvasTextNode'

