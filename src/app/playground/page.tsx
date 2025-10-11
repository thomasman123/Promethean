"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { Tldraw, TLEditorComponents, Editor, createShapeId, TLShape, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { PageManagerSidebar, PlaygroundPage } from '@/components/playground/page-manager-sidebar'
import { WidgetConfigDialog } from '@/components/playground/widget-config-dialog'
import { PlaygroundWidgetConfig, PlaygroundWidget } from '@/components/playground/playground-widget'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'
import { BarChart3, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PlaygroundPageContent {
  tldrawSnapshot?: any
  widgets: {
  id: string
    config: PlaygroundWidgetConfig
    position: { x: number; y: number }
    size: { width: number; height: number }
  }[]
}

function PlaygroundContent() {
  const { selectedAccountId } = useDashboard()
  const { toast } = useToast()
  
  const [boardId, setBoardId] = useState<string | null>(null)
  const [pages, setPages] = useState<PlaygroundPage[]>([])
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [pageContent, setPageContent] = useState<PlaygroundPageContent>({ widgets: [] })
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Load board and pages
  useEffect(() => {
    if (selectedAccountId) {
      loadBoardAndPages()
    }
  }, [selectedAccountId])

  // Load page content when current page changes
  useEffect(() => {
    if (currentPageId) {
      loadPageContent(currentPageId)
    }
  }, [currentPageId])

  const loadBoardAndPages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/playground/boards?accountId=${selectedAccountId}`)
      
      if (!response.ok) throw new Error('Failed to load board')
      
      const data = await response.json()
      setBoardId(data.board.id)
      setPages(data.board.pages || [])
      
      // Select first page if available
      if (data.board.pages?.length > 0) {
        setCurrentPageId(data.board.pages[0].id)
      }
    } catch (error) {
      console.error('Error loading board:', error)
      toast({
        title: 'Error',
        description: 'Failed to load playground board',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPageContent = async (pageId: string) => {
    try {
      const response = await fetch(`/api/playground/pages/${pageId}/content`)
      
      if (!response.ok) throw new Error('Failed to load content')
      
      const data = await response.json()
      setPageContent(data.content || { widgets: [] })
      
      // Load tldraw snapshot if available
      if (data.content?.tldrawSnapshot && editor) {
        try {
          editor.store.loadSnapshot(data.content.tldrawSnapshot)
        } catch (err) {
          console.error('Error loading tldraw snapshot:', err)
        }
      }
    } catch (error) {
      console.error('Error loading page content:', error)
    }
  }

  const savePageContent = useCallback(async (content: PlaygroundPageContent) => {
    if (!currentPageId || isSaving) return
    
    try {
      setIsSaving(true)
      const response = await fetch(`/api/playground/pages/${currentPageId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) throw new Error('Failed to save content')
      
    } catch (error) {
      console.error('Error saving content:', error)
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentPageId, isSaving, toast])

  const debouncedSave = useCallback((content: PlaygroundPageContent) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      savePageContent(content)
    }, 2000)
  }, [savePageContent])

  const handlePageCreate = async () => {
    if (!boardId) return
    
    try {
      const response = await fetch('/api/playground/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          name: `Page ${pages.length + 1}`
        })
      })
      
      if (!response.ok) throw new Error('Failed to create page')
      
      const data = await response.json()
      setPages([...pages, data.page])
      setCurrentPageId(data.page.id)
      
      toast({
        title: 'Success',
        description: 'Page created'
      })
    } catch (error) {
      console.error('Error creating page:', error)
      toast({
        title: 'Error',
        description: 'Failed to create page',
        variant: 'destructive'
      })
    }
  }

  const handlePageRename = async (pageId: string, newName: string) => {
    try {
      const response = await fetch('/api/playground/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, name: newName })
      })
      
      if (!response.ok) throw new Error('Failed to rename page')
      
      const data = await response.json()
      setPages(pages.map(p => p.id === pageId ? data.page : p))
      
      toast({
        title: 'Success',
        description: 'Page renamed'
      })
    } catch (error) {
      console.error('Error renaming page:', error)
      toast({
        title: 'Error',
        description: 'Failed to rename page',
        variant: 'destructive'
      })
    }
  }

  const handlePageDuplicate = async (pageId: string) => {
    if (!boardId) return
    
    try {
      // First, load the content of the page to duplicate
      const contentResponse = await fetch(`/api/playground/pages/${pageId}/content`)
      const contentData = await contentResponse.json()
      
      // Create new page
      const page = pages.find(p => p.id === pageId)
      const response = await fetch('/api/playground/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          name: `${page?.name} (Copy)`
        })
      })
      
      if (!response.ok) throw new Error('Failed to duplicate page')
      
      const data = await response.json()
      
      // Copy content to new page
      await fetch(`/api/playground/pages/${data.page.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentData.content })
      })
      
      setPages([...pages, data.page])
      
      toast({
        title: 'Success',
        description: 'Page duplicated'
      })
    } catch (error) {
      console.error('Error duplicating page:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate page',
        variant: 'destructive'
      })
    }
  }

  const handlePageDelete = async (pageId: string) => {
    if (pages.length === 1) {
      toast({
        title: 'Error',
        description: 'Cannot delete the last page',
        variant: 'destructive'
      })
      return
    }
    
    try {
      const response = await fetch(`/api/playground/pages?pageId=${pageId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete page')
      
      const newPages = pages.filter(p => p.id !== pageId)
      setPages(newPages)
      
      // Switch to another page if current was deleted
      if (currentPageId === pageId && newPages.length > 0) {
        setCurrentPageId(newPages[0].id)
      }
      
      toast({
        title: 'Success',
        description: 'Page deleted'
      })
    } catch (error) {
      console.error('Error deleting page:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete page',
        variant: 'destructive'
      })
    }
  }

  const handleAddWidget = (config: PlaygroundWidgetConfig) => {
    if (!editor) return
    
    // Add widget to center of viewport
    const viewport = editor.getViewportPageBounds()
    const position = {
      x: viewport.center.x - 200,
      y: viewport.center.y - 150
    }
    
    const newWidget = {
      id: `widget-${Date.now()}`,
      config,
      position,
      size: { width: 400, height: 300 }
    }
    
    const updatedContent = {
      ...pageContent,
      widgets: [...pageContent.widgets, newWidget]
    }
    
    setPageContent(updatedContent)
    debouncedSave(updatedContent)
    
    setIsWidgetDialogOpen(false)
  }

  const handleSaveNow = () => {
    if (!editor || !currentPageId) return
    
    // Get tldraw snapshot
    const snapshot = editor.store.getSnapshot()
    
    const content: PlaygroundPageContent = {
      tldrawSnapshot: snapshot,
      widgets: pageContent.widgets
    }
    
    savePageContent(content)
  }

  if (!selectedAccountId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Select an Account</h2>
          <p className="text-muted-foreground">
            Please select an account to access the playground
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-card border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
              <Button
            size="sm"
            variant="default"
            onClick={() => setIsWidgetDialogOpen(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Add Widget
                  </Button>
                </div>
                
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
              <Button
                size="sm"
            variant="outline"
            onClick={handleSaveNow}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Now
              </Button>
            </div>
          </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <PageManagerSidebar
          pages={pages}
          currentPageId={currentPageId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onPageSelect={setCurrentPageId}
          onPageCreate={handlePageCreate}
          onPageRename={handlePageRename}
          onPageDuplicate={handlePageDuplicate}
          onPageDelete={handlePageDelete}
        />

        <div className="flex-1 relative">
          {/* Tldraw Canvas */}
          <div className="absolute inset-0">
            <Tldraw
              onMount={(editorInstance) => {
                setEditor(editorInstance)
              }}
              components={customComponents}
            >
              {/* Render widgets as overlays */}
              <WidgetOverlays 
                widgets={pageContent.widgets}
                onConfigChange={(widgetId, config) => {
                  const updatedContent = {
                    ...pageContent,
                    widgets: pageContent.widgets.map(w =>
                      w.id === widgetId ? { ...w, config } : w
                    )
                  }
                  setPageContent(updatedContent)
                  debouncedSave(updatedContent)
                }}
              />
            </Tldraw>
          </div>
        </div>
      </div>

      {/* Widget Configuration Dialog */}
      <WidgetConfigDialog
        isOpen={isWidgetDialogOpen}
        onClose={() => setIsWidgetDialogOpen(false)}
        onConfirm={handleAddWidget}
      />
    </div>
  )
}

// Custom components for tldraw UI
const customComponents: TLEditorComponents = {
  // Hide some UI elements for cleaner interface
}

// Widget overlays component
function WidgetOverlays({ 
  widgets, 
  onConfigChange 
}: { 
  widgets: PlaygroundPageContent['widgets']
  onConfigChange: (widgetId: string, config: PlaygroundWidgetConfig) => void
}) {
  const editor = useEditor()
  
  if (!editor) return null
  
  return (
    <div className="tl-overlays__wrapper">
      {widgets.map((widget) => {
        const screenPos = editor.pageToScreen(widget.position)
        
        return (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              width: widget.size.width,
              height: widget.size.height,
              pointerEvents: 'auto',
              transform: `scale(${editor.getZoomLevel()})`,
              transformOrigin: 'top left'
            }}
          >
            <PlaygroundWidget
              config={widget.config}
              width={widget.size.width}
              height={widget.size.height}
              onConfigChange={(config) => onConfigChange(widget.id, config)}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function PlaygroundPage() {
  return (
    <LayoutWrapper>
      <PlaygroundContent />
    </LayoutWrapper>
  )
} 
