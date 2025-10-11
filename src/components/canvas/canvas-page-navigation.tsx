"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanvas, CanvasBoard } from '@/lib/canvas-context'

interface CanvasPageNavigationProps {
  className?: string
}

export function CanvasPageNavigation({ className }: CanvasPageNavigationProps) {
  const { 
    boards, 
    selectedBoardId, 
    setSelectedBoardId, 
    createBoard, 
    updateBoard, 
    deleteBoard, 
    duplicateBoard 
  } = useCanvas()
  
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set())
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const toggleExpanded = (boardId: string) => {
    setExpandedBoards(prev => {
      const next = new Set(prev)
      if (next.has(boardId)) {
        next.delete(boardId)
      } else {
        next.add(boardId)
      }
      return next
    })
  }

  const handleCreateBoard = async (parentId?: string) => {
    const board = await createBoard('Untitled Board', parentId || null)
    if (board) {
      setSelectedBoardId(board.id)
    }
  }

  const handleRename = (board: CanvasBoard) => {
    setEditingBoardId(board.id)
    setEditingName(board.name)
  }

  const handleRenameSubmit = async () => {
    if (editingBoardId && editingName.trim()) {
      await updateBoard(editingBoardId, { name: editingName.trim() })
    }
    setEditingBoardId(null)
    setEditingName('')
  }

  const handleDuplicate = async (boardId: string) => {
    const board = await duplicateBoard(boardId)
    if (board) {
      setSelectedBoardId(board.id)
    }
  }

  const handleDelete = async (boardId: string) => {
    if (confirm('Are you sure you want to delete this board?')) {
      await deleteBoard(boardId)
    }
  }

  const renderBoard = (board: CanvasBoard, depth = 0) => {
    const hasChildren = boards.some(b => b.parent_board_id === board.id)
    const isExpanded = expandedBoards.has(board.id)
    const isEditing = editingBoardId === board.id
    const isSelected = selectedBoardId === board.id

    return (
      <div key={board.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent cursor-pointer group",
            isSelected && "bg-accent",
            depth > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(board.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-5" />}

          <span className="text-base mr-1">{board.icon}</span>

          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') {
                  setEditingBoardId(null)
                  setEditingName('')
                }
              }}
              className="h-6 text-xs flex-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm flex-1 truncate"
              onClick={() => setSelectedBoardId(board.id)}
            >
              {board.name}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRename(board)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(board.id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateBoard(board.id)}>
                Add Sub-page
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(board.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {boards
              .filter(b => b.parent_board_id === board.id)
              .map(child => renderBoard(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const topLevelBoards = boards.filter(b => !b.parent_board_id)

  return (
    <div className={cn("flex flex-col h-full bg-background border-r border-border", className)}>
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold mb-2">Canvas Boards</h2>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => handleCreateBoard()}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {topLevelBoards.map(board => renderBoard(board))}
        </div>
      </ScrollArea>
    </div>
  )
}

