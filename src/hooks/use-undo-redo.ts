import { useState, useCallback, useRef } from 'react'

interface UndoRedoState<T> {
  current: T
  history: T[]
  historyIndex: number
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    current: initialState,
    history: [initialState],
    historyIndex: 0
  })

  const isUpdating = useRef(false)

  const pushState = useCallback((newState: T | ((prev: T) => T)) => {
    if (isUpdating.current) return

    setState(prev => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev.current) 
        : newState

      // Remove any history after current index
      const newHistory = prev.history.slice(0, prev.historyIndex + 1)
      newHistory.push(nextState)

      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift()
      }

      return {
        current: nextState,
        history: newHistory,
        historyIndex: newHistory.length - 1
      }
    })
  }, [maxHistory])

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev

      const newIndex = prev.historyIndex - 1
      isUpdating.current = true
      
      setTimeout(() => {
        isUpdating.current = false
      }, 0)

      return {
        ...prev,
        current: prev.history[newIndex],
        historyIndex: newIndex
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev

      const newIndex = prev.historyIndex + 1
      isUpdating.current = true
      
      setTimeout(() => {
        isUpdating.current = false
      }, 0)

      return {
        ...prev,
        current: prev.history[newIndex],
        historyIndex: newIndex
      }
    })
  }, [])

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  return {
    state: state.current,
    setState: pushState,
    undo,
    redo,
    canUndo,
    canRedo
  }
} 