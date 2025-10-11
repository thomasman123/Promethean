"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

export interface CanvasBoard {
  id: string
  name: string
  account_id: string
  created_by: string
  sharing_mode: 'private' | 'team' | 'public' | 'custom'
  allowed_users: string[]
  parent_board_id: string | null
  position: number
  is_archived: boolean
  icon: string
  created_at: string
  updated_at: string
}

export interface CanvasElement {
  id: string
  board_id: string
  type: 'shape' | 'arrow' | 'text' | 'widget' | 'sticky-note'
  element_data: any
  widget_config?: any
  position: { x: number; y: number }
  size?: { width: number; height: number }
  style?: any
  z_index: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Collaborator {
  id: string
  board_id: string
  user_id: string
  cursor_position: { x: number; y: number }
  current_selection: string[]
  online_at: string
  color: string
  user_name: string | null
}

interface CanvasContextType {
  selectedBoardId: string | null
  setSelectedBoardId: (id: string | null) => void
  boards: CanvasBoard[]
  elements: CanvasElement[]
  collaborators: Collaborator[]
  loading: boolean
  addElement: (element: Omit<CanvasElement, 'id' | 'created_at' | 'updated_at'>) => Promise<CanvasElement | null>
  updateElement: (id: string, updates: Partial<CanvasElement>) => Promise<void>
  deleteElement: (id: string) => Promise<void>
  createBoard: (name: string, parentId?: string | null) => Promise<CanvasBoard | null>
  updateBoard: (id: string, updates: Partial<CanvasBoard>) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  duplicateBoard: (id: string) => Promise<CanvasBoard | null>
  refreshBoards: () => Promise<void>
  refreshElements: () => Promise<void>
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const { selectedAccountId } = useDashboard()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [boards, setBoards] = useState<CanvasBoard[]>([])
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  // Load boards when account changes
  const refreshBoards = useCallback(async () => {
    if (!selectedAccountId) return

    try {
      const response = await fetch(`/api/canvas/boards?accountId=${selectedAccountId}`)
      if (response.ok) {
        const data = await response.json()
        setBoards(data.boards || [])
      }
    } catch (error) {
      console.error('Failed to load boards:', error)
    }
  }, [selectedAccountId])

  // Load elements when board changes
  const refreshElements = useCallback(async () => {
    if (!selectedBoardId) {
      setElements([])
      return
    }

    try {
      const response = await fetch(`/api/canvas/elements?boardId=${selectedBoardId}`)
      if (response.ok) {
        const data = await response.json()
        setElements(data.elements || [])
      }
    } catch (error) {
      console.error('Failed to load elements:', error)
    }
  }, [selectedBoardId])

  useEffect(() => {
    setLoading(true)
    refreshBoards().finally(() => setLoading(false))
  }, [refreshBoards])

  useEffect(() => {
    refreshElements()
  }, [refreshElements])

  const createBoard = async (name: string, parentId: string | null = null): Promise<CanvasBoard | null> => {
    if (!selectedAccountId) return null

    try {
      const response = await fetch('/api/canvas/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          account_id: selectedAccountId,
          parent_board_id: parentId,
        })
      })

      if (response.ok) {
        const data = await response.json()
        await refreshBoards()
        return data.board
      }
    } catch (error) {
      console.error('Failed to create board:', error)
    }
    return null
  }

  const updateBoard = async (id: string, updates: Partial<CanvasBoard>) => {
    try {
      const response = await fetch('/api/canvas/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      if (response.ok) {
        await refreshBoards()
      }
    } catch (error) {
      console.error('Failed to update board:', error)
    }
  }

  const deleteBoard = async (id: string) => {
    try {
      const response = await fetch('/api/canvas/boards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        if (selectedBoardId === id) {
          setSelectedBoardId(null)
        }
        await refreshBoards()
      }
    } catch (error) {
      console.error('Failed to delete board:', error)
    }
  }

  const duplicateBoard = async (id: string): Promise<CanvasBoard | null> => {
    try {
      const response = await fetch(`/api/canvas/boards/${id}`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        await refreshBoards()
        return data.board
      }
    } catch (error) {
      console.error('Failed to duplicate board:', error)
    }
    return null
  }

  const addElement = async (element: Omit<CanvasElement, 'id' | 'created_at' | 'updated_at'>): Promise<CanvasElement | null> => {
    try {
      const response = await fetch('/api/canvas/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(element)
      })

      if (response.ok) {
        const data = await response.json()
        setElements(prev => [...prev, data.element])
        return data.element
      }
    } catch (error) {
      console.error('Failed to add element:', error)
    }
    return null
  }

  const updateElement = async (id: string, updates: Partial<CanvasElement>) => {
    try {
      // Optimistic update
      setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))

      const response = await fetch('/api/canvas/elements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })

      if (!response.ok) {
        // Revert on failure
        await refreshElements()
      }
    } catch (error) {
      console.error('Failed to update element:', error)
      await refreshElements()
    }
  }

  const deleteElement = async (id: string) => {
    try {
      // Optimistic delete
      setElements(prev => prev.filter(el => el.id !== id))

      const response = await fetch('/api/canvas/elements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!response.ok) {
        // Revert on failure
        await refreshElements()
      }
    } catch (error) {
      console.error('Failed to delete element:', error)
      await refreshElements()
    }
  }

  return (
    <CanvasContext.Provider value={{
      selectedBoardId,
      setSelectedBoardId,
      boards,
      elements,
      collaborators,
      loading,
      addElement,
      updateElement,
      deleteElement,
      createBoard,
      updateBoard,
      deleteBoard,
      duplicateBoard,
      refreshBoards,
      refreshElements,
    }}>
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}

