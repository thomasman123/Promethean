"use client"

import { useEffect, useCallback } from 'react'

interface UseCanvasKeyboardProps {
  onUndo?: () => void
  onRedo?: () => void
  onDelete?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onSelectAll?: () => void
  onEscape?: () => void
  onDuplicate?: () => void
}

export function useCanvasKeyboard({
  onUndo,
  onRedo,
  onDelete,
  onCopy,
  onPaste,
  onSelectAll,
  onEscape,
  onDuplicate,
}: UseCanvasKeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modifier = isMac ? e.metaKey : e.ctrlKey

    // Undo: Cmd/Ctrl + Z
    if (modifier && e.key === 'z' && !e.shiftKey && onUndo) {
      e.preventDefault()
      onUndo()
    }

    // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
    if (((modifier && e.key === 'z' && e.shiftKey) || (modifier && e.key === 'y')) && onRedo) {
      e.preventDefault()
      onRedo()
    }

    // Delete: Delete or Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
      e.preventDefault()
      onDelete()
    }

    // Copy: Cmd/Ctrl + C
    if (modifier && e.key === 'c' && onCopy) {
      e.preventDefault()
      onCopy()
    }

    // Paste: Cmd/Ctrl + V
    if (modifier && e.key === 'v' && onPaste) {
      e.preventDefault()
      onPaste()
    }

    // Select All: Cmd/Ctrl + A
    if (modifier && e.key === 'a' && onSelectAll) {
      e.preventDefault()
      onSelectAll()
    }

    // Duplicate: Cmd/Ctrl + D
    if (modifier && e.key === 'd' && onDuplicate) {
      e.preventDefault()
      onDuplicate()
    }

    // Escape
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
    }
  }, [onUndo, onRedo, onDelete, onCopy, onPaste, onSelectAll, onEscape, onDuplicate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

