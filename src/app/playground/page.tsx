"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { PageManagerSidebar, PlaygroundPage } from '@/components/playground/page-manager-sidebar'
import { WidgetConfigDialog } from '@/components/playground/widget-config-dialog'
import { PlaygroundWidgetConfig } from '@/components/playground/playground-widget'
import { CanvasSystem, CanvasElement } from '@/components/playground/canvas-system'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Save, 
  Loader2, 
  MousePointer, 
  Hand, 
  Pencil, 
  Type, 
  Square,
  Circle,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Tool = 'select' | 'pan' | 'draw' | 'text' | 'shape' | 'arrow'

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
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([])
  
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
      const content = data.content || {}
      
      // Convert stored widgets to canvas elements
      const elements: CanvasElement[] = (content.elements || []).map((el: any) => ({
        ...el,
        zIndex: el.zIndex || 0
      }))
      
      setCanvasElements(elements)
    } catch (error) {
      console.error('Error loading page content:', error)
    }
  }

  const savePageContent = useCallback(async (elements: CanvasElement[]) => {
    if (!currentPageId || isSaving) return
    
    try {
      setIsSaving(true)
      const response = await fetch(`/api/playground/pages/${currentPageId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: {
            elements
          }
        })
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

  const debouncedSave = useCallback((elements: CanvasElement[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      savePageContent(elements)
    }, 2000)
  }, [savePageContent])

  const handleElementsChange = useCallback((elements: CanvasElement[]) => {
    setCanvasElements(elements)
    debouncedSave(elements)
  }, [debouncedSave])

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
      const contentResponse = await fetch(`/api/playground/pages/${pageId}/content`)
      const contentData = await contentResponse.json()
      
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
    const newElement: CanvasElement = {
      id: `widget-${Date.now()}`,
      type: 'widget',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      zIndex: canvasElements.length,
      data: config
    }
    
    const newElements = [...canvasElements, newElement]
    setCanvasElements(newElements)
    debouncedSave(newElements)
    setIsWidgetDialogOpen(false)
  }

  const handleSaveNow = () => {
    if (currentPageId) {
      savePageContent(canvasElements)
    }
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
          {/* Tool selection */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              size="sm"
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              onClick={() => setSelectedTool('select')}
              className="h-8 w-8 p-0"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={selectedTool === 'pan' ? 'default' : 'ghost'}
              onClick={() => setSelectedTool('pan')}
              className="h-8 w-8 p-0"
            >
              <Hand className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              size="sm"
              variant="default"
              onClick={() => setIsWidgetDialogOpen(true)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </div>
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
          <CanvasSystem
            elements={canvasElements}
            onElementsChange={handleElementsChange}
            selectedTool={selectedTool}
          />
        </div>
      </div>

      <WidgetConfigDialog
        isOpen={isWidgetDialogOpen}
        onClose={() => setIsWidgetDialogOpen(false)}
        onConfirm={handleAddWidget}
      />
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
