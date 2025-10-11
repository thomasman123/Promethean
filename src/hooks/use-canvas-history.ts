"use client"

import { useState, useCallback, useRef } from 'react'
import { CanvasElement } from '@/lib/canvas-context'

interface HistoryState {
  elements: CanvasElement[]
  timestamp: number
}

const MAX_HISTORY_SIZE = 50

export function useCanvasHistory(initialElements: CanvasElement[]) {
  const [history, setHistory] = useState<HistoryState[]>([
    { elements: initialElements, timestamp: Date.now() }
  ])
  const [currentIndex, setCurrentIndex] = useState(0)
  const isUndoRedo = useRef(false)

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const saveState = useCallback((elements: CanvasElement[]) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false
      return
    }

    setHistory((prev) => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1)
      
      // Add new state
      newHistory.push({
        elements: JSON.parse(JSON.stringify(elements)), // Deep clone
        timestamp: Date.now()
      })

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
        setCurrentIndex((prev) => prev - 1)
      } else {
        setCurrentIndex(newHistory.length - 1)
      }

      return newHistory
    })
  }, [currentIndex])

  const undo = useCallback(() => {
    if (!canUndo) return null

    isUndoRedo.current = true
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex].elements
  }, [canUndo, currentIndex, history])

  const redo = useCallback(() => {
    if (!canRedo) return null

    isUndoRedo.current = true
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex].elements
  }, [canRedo, currentIndex, history])

  const reset = useCallback((elements: CanvasElement[]) => {
    setHistory([{ elements, timestamp: Date.now() }])
    setCurrentIndex(0)
  }, [])

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    saveState,
    reset,
  }
}

