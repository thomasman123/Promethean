"use client"

import { useState, useCallback, useEffect } from 'react'
import { CanvasFlow } from './canvas-flow'
import { CanvasToolbar, ToolType } from './canvas-toolbar'
import { CanvasPageNavigation } from './canvas-page-navigation'
import { CanvasWidgetPicker } from './canvas-widget-picker'
import { CanvasShareModal } from './canvas-share-modal'
import { CanvasCollaborationCursors } from './canvas-collaboration-cursors'
import { WidgetConfig } from '@/components/dashboard/add-widget-modal'
import { useCanvas } from '@/lib/canvas-context'
import { useRealtimeCollaboration } from '@/hooks/use-realtime-collaboration'
import { startOfMonth } from 'date-fns'
import { createBrowserClient } from '@supabase/ssr'

export function CanvasWorkspace() {
  const { selectedBoardId, addElement, elements, deleteElement, refreshElements } = useCanvas()
  const [selectedTool, setSelectedTool] = useState<ToolType>('select')
  const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  // Get current user
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Get user profile for name
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setCurrentUser({
              id: user.id,
              name: data?.name || user.email || 'Anonymous',
            })
          })
      }
    })
  }, [])

  // Real-time collaboration
  const { collaborators, isConnected } = useRealtimeCollaboration({
    boardId: selectedBoardId,
    userId: currentUser?.id || null,
    userName: currentUser?.name || null,
    onElementChange: (payload) => {
      // Refresh elements when changes occur from other users
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        refreshElements()
      }
    },
  })

  const handleToolSelect = (tool: ToolType) => {
    setSelectedTool(tool)
    if (tool === 'widget') {
      setIsWidgetPickerOpen(true)
    }
  }

  const handleAddWidget = useCallback(async (widget: WidgetConfig) => {
    if (!selectedBoardId) return

    // Default date range for new widgets
    const today = new Date()
    const defaultDateRange = {
      from: startOfMonth(today),
      to: today,
    }

    // Add widget as canvas element
    await addElement({
      board_id: selectedBoardId,
      type: 'widget',
      element_data: {},
      widget_config: {
        ...widget,
        dateRange: defaultDateRange,
      },
      position: { x: 100, y: 100 }, // Center-ish position
      size: { width: 400, height: 300 },
      z_index: elements.length,
      created_by: '',
    })

    setIsWidgetPickerOpen(false)
    setSelectedTool('select')
  }, [selectedBoardId, addElement, elements.length])

  const handleDeleteSelection = useCallback(() => {
    // Find selected nodes and delete them
    elements.forEach((el) => {
      // In a real implementation, we'd track selected elements
      // For now, this is a placeholder
    })
  }, [elements])

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  return (
    <div className="flex h-screen relative">
      {/* Left Sidebar - Page Navigation */}
      <CanvasPageNavigation className="w-64" />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <CanvasToolbar
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          onDelete={handleDeleteSelection}
          onShare={handleShare}
          hasSelection={hasSelection}
          isConnected={isConnected}
          collaboratorCount={collaborators.length}
        />

        {/* Canvas */}
        <div className="flex-1">
          <CanvasFlow
            selectedTool={selectedTool}
            onWidgetToolClick={() => setIsWidgetPickerOpen(true)}
            onSelectionChange={setHasSelection}
            onDeleteSelection={handleDeleteSelection}
          />
        </div>
      </div>

      {/* Collaboration Cursors */}
      {currentUser && (
        <CanvasCollaborationCursors
          collaborators={collaborators}
          currentUserId={currentUser.id}
        />
      )}

      {/* Widget Picker Modal */}
      <CanvasWidgetPicker
        open={isWidgetPickerOpen}
        onOpenChange={setIsWidgetPickerOpen}
        onAddWidget={handleAddWidget}
      />

      {/* Share Modal */}
      <CanvasShareModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        boardId={selectedBoardId}
      />
    </div>
  )
}

