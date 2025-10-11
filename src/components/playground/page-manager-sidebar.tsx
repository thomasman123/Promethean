"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Plus, MoreVertical, Edit2, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface PlaygroundPage {
  id: string
  name: string
  order: number
  created_at?: string
  updated_at?: string
}

interface PageManagerSidebarProps {
  pages: PlaygroundPage[]
  currentPageId: string | null
  isOpen: boolean
  onToggle: () => void
  onPageSelect: (pageId: string) => void
  onPageCreate: () => void
  onPageRename: (pageId: string, newName: string) => void
  onPageDuplicate: (pageId: string) => void
  onPageDelete: (pageId: string) => void
}

export function PageManagerSidebar({
  pages,
  currentPageId,
  isOpen,
  onToggle,
  onPageSelect,
  onPageCreate,
  onPageRename,
  onPageDuplicate,
  onPageDelete
}: PageManagerSidebarProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletePageId, setDeletePageId] = useState<string | null>(null)

  const handleStartEdit = (page: PlaygroundPage) => {
    setEditingPageId(page.id)
    setEditingName(page.name)
  }

  const handleSaveEdit = () => {
    if (editingPageId && editingName.trim()) {
      onPageRename(editingPageId, editingName.trim())
    }
    setEditingPageId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingPageId(null)
    setEditingName('')
  }

  const handleDeleteConfirm = () => {
    if (deletePageId) {
      onPageDelete(deletePageId)
      setDeletePageId(null)
    }
  }

  return (
    <>
      <div
        className={cn(
          "bg-card border-r transition-all duration-300 flex flex-col relative h-full",
          isOpen ? "w-64" : "w-12"
        )}
      >
        {/* Toggle Button */}
        <div className="p-2 border-b flex items-center justify-between shrink-0">
          {isOpen ? (
            <>
              <h3 className="font-semibold text-sm px-2">Pages</h3>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onToggle}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 mx-auto"
              onClick={onToggle}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isOpen && (
          <>
            {/* New Page Button */}
            <div className="p-3 border-b shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={onPageCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Page
              </Button>
            </div>

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto p-2">
              {pages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-4">
                  No pages yet
                </div>
              ) : (
                <div className="space-y-1">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={cn(
                        "group relative rounded-md transition-colors",
                        currentPageId === page.id
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      {editingPageId === page.id ? (
                        <div className="p-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            onBlur={handleSaveEdit}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => onPageSelect(page.id)}
                            className={cn(
                              "flex-1 text-left px-3 py-2 text-sm truncate",
                              currentPageId === page.id && "font-medium text-primary"
                            )}
                          >
                            {page.name}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleStartEdit(page)}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onPageDuplicate(page.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletePageId(page.id)}
                                className="text-destructive focus:text-destructive"
                                disabled={pages.length === 1}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletePageId !== null} onOpenChange={(open) => !open && setDeletePageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
              All content on this page will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePageId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

