'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Pencil, 
  Type, 
  Plus,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MousePointer,
  Hand,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfiniteCanvas } from '@/components/playground/infinite-canvas'
import { ShapesToolbar, ShapeType } from '@/components/playground/shapes-toolbar'
import { WidgetModal, WidgetType } from '@/components/playground/widget-modal'
import { CanvasElement, CanvasElementData } from '@/components/playground/canvas-element'
import { DrawingLayer } from '@/components/playground/drawing-layer'
import { TransformHandles } from '@/components/playground/transform-handles'
import { SnapGuides, snapToGuides } from '@/components/playground/snap-guides'
import { useUndoRedo } from '@/hooks/use-undo-redo'
import { AutosaveStatus } from '@/components/playground/autosave-status'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'

interface Page {
  id: string
  name: string
  elements: CanvasElementData[]
}

type ToolType = 'select' | 'hand' | 'pencil' | 'text' | 'shapes' | null

function PlaygroundContent() {
  const [pages, setPages] = useState<Page[]>([
    { id: '1', name: 'Page 1', elements: [] }
  ])
  const [currentPageId, setCurrentPageId] = useState('1')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedTool, setSelectedTool] = useState<ToolType>('select')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false)
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle')
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [dragInfo, setDragInfo] = useState<{
    elementId: string
    startX: number
    startY: number
    elementStartX: number
    elementStartY: number
    elementWidth: number
    elementHeight: number
  } | null>(null)
  const [drawingColor, setDrawingColor] = useState('#000000')
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [previousTool, setPreviousTool] = useState<ToolType>('select')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedElement, setDraggedElement] = useState<CanvasElementData | null>(null)

  const currentPage = pages.find(p => p.id === currentPageId)

  // Add new page
  const addNewPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: `Page ${pages.length + 1}`,
      elements: []
    }
    setPages([...pages, newPage])
    setCurrentPageId(newPage.id)
  }

  // Add element to canvas
  const addElement = (type: CanvasElementData['type'], position: { x: number, y: number }, content?: any) => {
    if (!currentPage) return

    const newElement: CanvasElementData = {
      id: Date.now().toString(),
      type,
      x: position.x,
      y: position.y,
      width: type === 'widget' ? 300 : 100,
      height: type === 'widget' ? 200 : 100,
      content,
      color: drawingColor
    }

    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }

  // Handle element selection
  const handleSelectElement = useCallback((elementId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedElements(prev => {
        const newSet = new Set(prev)
        if (newSet.has(elementId)) {
          newSet.delete(elementId)
        } else {
          newSet.add(elementId)
        }
        return newSet
      })
    } else {
      setSelectedElements(new Set([elementId]))
    }
  }, [])

  // Handle element deletion
  const handleDeleteElement = useCallback((elementId: string) => {
    if (!currentPage) return

    const updatedPage = {
      ...currentPage,
      elements: currentPage.elements.filter(el => el.id !== elementId)
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
    setSelectedElements(prev => {
      const newSet = new Set(prev)
      newSet.delete(elementId)
      return newSet
    })
  }, [currentPage, pages])

  // Handle element duplication
  const handleDuplicateElement = useCallback((elementId: string) => {
    if (!currentPage) return

    const element = currentPage.elements.find(el => el.id === elementId)
    if (!element) return

    const newElement: CanvasElementData = {
      ...element,
      id: Date.now().toString(),
      x: element.x + 20,
      y: element.y + 20
    }

    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }, [currentPage, pages])

  // Handle element update
  const handleUpdateElement = useCallback((elementId: string, updates: Partial<CanvasElementData>) => {
    if (!currentPage) return

    const updatedPage = {
      ...currentPage,
      elements: currentPage.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }, [currentPage, pages])

  // Handle drag start
  const handleDragStart = useCallback((elementId: string, clientX: number, clientY: number) => {
    const element = currentPage?.elements.find(el => el.id === elementId)
    if (!element) return

    setDragInfo({
      elementId,
      startX: clientX,
      startY: clientY,
      elementStartX: element.x,
      elementStartY: element.y,
      elementWidth: element.width || 100,
      elementHeight: element.height || 100
    })
  }, [currentPage])

  // Handle z-order changes
  const handleBringToFront = useCallback((elementId: string) => {
    if (!currentPage) return

    const element = currentPage.elements.find(el => el.id === elementId)
    if (!element) return

    const otherElements = currentPage.elements.filter(el => el.id !== elementId)
    const updatedPage = {
      ...currentPage,
      elements: [...otherElements, element]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }, [currentPage, pages])

  const handleSendToBack = useCallback((elementId: string) => {
    if (!currentPage) return

    const element = currentPage.elements.find(el => el.id === elementId)
    if (!element) return

    const otherElements = currentPage.elements.filter(el => el.id !== elementId)
    const updatedPage = {
      ...currentPage,
      elements: [element, ...otherElements]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }, [currentPage, pages])

  // Handle mouse move for dragging
  useEffect(() => {
    if (!dragInfo) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startX) / zoom
      const dy = (e.clientY - dragInfo.startY) / zoom

      // Apply snapping
      const snappedPosition = snapToGuides(
        {
          x: dragInfo.elementStartX + dx,
          y: dragInfo.elementStartY + dy
        },
        dragInfo.elementWidth || 100,
        dragInfo.elementHeight || 100,
        currentPage?.elements || [],
        dragInfo.elementId,
        5 / zoom
      )

      handleUpdateElement(dragInfo.elementId, {
        x: snappedPosition.x,
        y: snappedPosition.y
      })
    }

    const handleMouseUp = () => {
      setDragInfo(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragInfo, zoom, handleUpdateElement])

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent, worldPos: { x: number, y: number }) => {
    if (selectedTool === 'text') {
      // Create text element centered on click position
      const width = 200
      const height = 40
      const newElement: CanvasElementData = {
        id: Date.now().toString(),
        type: 'text',
        x: worldPos.x - width / 2,
        y: worldPos.y - height / 2,
        width,
        height,
        content: 'Click to edit',
        color: drawingColor
      }
      
      if (currentPage) {
        const updatedPage = {
          ...currentPage,
          elements: [...currentPage.elements, newElement]
        }
        setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
        setSelectedElements(new Set([newElement.id]))
      }
    } else if (selectedTool === 'shapes') {
      // Center shape on click position
      const size = 100
      addElement('shape', { x: worldPos.x - size / 2, y: worldPos.y - size / 2 }, { shapeType: selectedShape })
    } else if (selectedTool === 'select') {
      // Clear selection when clicking on empty canvas
      setSelectedElements(new Set())
    }
  }, [selectedTool, selectedShape, currentPage, pages, drawingColor])

  // Handle widget creation
  const handleCreateWidget = (type: WidgetType, metric: string) => {
    // Place widget at center of viewport
    const width = 300
    const height = 200
    addElement('widget', { x: -width / 2, y: -height / 2 }, { widgetType: type, metric })
  }

  // Handle drawing completion
  const handleDrawingComplete = useCallback((path: string, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!currentPage) return

    // The path is already in world coordinates, just use the bounds as-is
    const newElement: CanvasElementData = {
      id: Date.now().toString(),
      type: 'drawing',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      path: path,
      color: drawingColor
    }

    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }, [currentPage, pages, drawingColor])

  // Handle keyboard events for spacebar panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        e.preventDefault()
        setIsSpacePressed(true)
        setPreviousTool(selectedTool)
        setSelectedTool('hand')
      }

      // Tool shortcuts
      switch(e.key.toLowerCase()) {
        case 'v':
          if (!e.metaKey && !e.ctrlKey) setSelectedTool('select')
          break
        case 'h':
          if (!e.metaKey && !e.ctrlKey) setSelectedTool('hand')
          break
        case 'p':
          if (!e.metaKey && !e.ctrlKey) setSelectedTool('pencil')
          break
        case 't':
          if (!e.metaKey && !e.ctrlKey) setSelectedTool('text')
          break
        case 's':
          if (!e.metaKey && !e.ctrlKey) setSelectedTool('shapes')
          break
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo
          console.log('Redo')
        } else {
          // Undo
          console.log('Undo')
        }
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedElements.forEach(id => handleDeleteElement(id))
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        selectedElements.forEach(id => handleDuplicateElement(id))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        setSelectedTool(previousTool)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedTool, previousTool, isSpacePressed, selectedElements, handleDeleteElement, handleDuplicateElement])

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      {/* Main Frame Container */}
      <Card className="flex-1 m-4 overflow-hidden flex flex-col mt-16">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Pages */}
          <div className={cn(
            "bg-card border-r transition-all duration-300 flex flex-col relative",
            isSidebarOpen ? "w-64" : "w-12"
          )}>
            {/* Toggle Button - Always Visible */}
            {!isSidebarOpen && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 left-1"
                onClick={() => setIsSidebarOpen(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            
            {isSidebarOpen && (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Pages</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="p-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addNewPage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {pages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => setCurrentPageId(page.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md mb-1 transition-colors",
                        currentPageId === page.id 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      {page.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Toggle sidebar button when closed */}
          {!isSidebarOpen && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-6 top-6 z-10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}

          {/* Canvas Area */}
          <div className="flex-1 relative bg-muted/20">
            <InfiniteCanvas
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              onCanvasClick={selectedTool === 'hand' ? undefined : handleCanvasClick}
              isPanMode={selectedTool === 'hand'}
            >
              {/* Canvas elements */}
              {currentPage?.elements.map(element => (
                <CanvasElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElements.has(element.id)}
                  onSelect={handleSelectElement}
                  onDelete={handleDeleteElement}
                  onDuplicate={handleDuplicateElement}
                  onUpdate={handleUpdateElement}
                  onDragStart={handleDragStart}
                  onBringToFront={handleBringToFront}
                  onSendToBack={handleSendToBack}
                  zoom={zoom}
                  currentTool={selectedTool || 'select'}
                />
              ))}
            </InfiniteCanvas>

            {/* Snap Guides */}
            {dragInfo && (
              <SnapGuides
                elements={currentPage?.elements || []}
                activeElement={currentPage?.elements.find(el => el.id === dragInfo.elementId) || null}
                zoom={zoom}
                pan={pan}
              />
            )}

            {/* Transform Handles - disabled for now to fix placement issues */}

            {/* Drawing Layer - overlays the canvas */}
            <DrawingLayer
              isActive={selectedTool === 'pencil'}
              zoom={zoom}
              pan={pan}
              color={drawingColor}
              onPathComplete={handleDrawingComplete}
            />

            {/* Autosave Status */}
            <div className="absolute top-4 left-4">
              <AutosaveStatus 
                lastSaved={lastSaved} 
                isSaving={isSaving} 
                hasError={false} 
              />
            </div>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                title="Zoom Out"
              >
                -
              </Button>
              <span className="flex items-center px-3 bg-background rounded-md text-sm">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                title="Zoom In"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  // Fit to content
                  if (currentPage && currentPage.elements.length > 0) {
                    let minX = Infinity, minY = Infinity
                    let maxX = -Infinity, maxY = -Infinity
                    
                    currentPage.elements.forEach(el => {
                      minX = Math.min(minX, el.x)
                      minY = Math.min(minY, el.y)
                      maxX = Math.max(maxX, el.x + (el.width || 100))
                      maxY = Math.max(maxY, el.y + (el.height || 100))
                    })
                    
                    const width = maxX - minX
                    const height = maxY - minY
                    const centerX = (minX + maxX) / 2
                    const centerY = (minY + maxY) / 2
                    
                    // Calculate zoom to fit
                    const padding = 100
                    const viewportWidth = window.innerWidth - 300 // Approximate canvas width
                    const viewportHeight = window.innerHeight - 200 // Approximate canvas height
                    
                    const scaleX = (viewportWidth - padding) / width
                    const scaleY = (viewportHeight - padding) / height
                    const newZoom = Math.min(Math.max(0.1, Math.min(scaleX, scaleY)), 2)
                    
                    setZoom(newZoom)
                    setPan({ x: -centerX, y: -centerY })
                  } else {
                    // Reset to default
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }
                }}
                title="Fit to Content"
              >
                Fit
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="relative p-4">
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="bg-card border rounded-full shadow-lg p-2 flex gap-1">
              <Button
                size="icon"
                variant={selectedTool === 'select' ? 'default' : 'ghost'}
                onClick={() => setSelectedTool('select')}
                className="rounded-full"
                title="Select (V)"
              >
                <MousePointer className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant={selectedTool === 'hand' ? 'default' : 'ghost'}
                onClick={() => setSelectedTool('hand')}
                className="rounded-full"
                title="Hand Tool (H)"
              >
                <Hand className="h-4 w-4" />
              </Button>
              
              <div className="w-px bg-border mx-1" />
              
              <Button
                size="icon"
                variant={selectedTool === 'pencil' ? 'default' : 'ghost'}
                onClick={() => setSelectedTool('pencil')}
                className="rounded-full"
                title="Pencil (P)"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              
              <Button
                size="icon"
                variant={selectedTool === 'text' ? 'default' : 'ghost'}
                onClick={() => setSelectedTool('text')}
                className="rounded-full"
                title="Text (T)"
              >
                <Type className="h-4 w-4" />
              </Button>
              
              <ShapesToolbar
                isActive={selectedTool === 'shapes'}
                onSelectShape={(shape: ShapeType) => {
                  setSelectedTool('shapes')
                  setSelectedShape(shape)
                }}
              />
              
              <div className="w-px bg-border mx-1" />
              
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsWidgetModalOpen(true)}
                className="rounded-full"
                title="Add Widget"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              
              <div className="w-px bg-border mx-1" />
              
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                title="Color"
              >
                <div className="relative">
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    value={drawingColor}
                    onChange={(e) => setDrawingColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Widget Modal */}
      <WidgetModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onCreateWidget={handleCreateWidget}
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