'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Type, 
  Plus,
  ChevronLeft,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfiniteCanvas } from '@/components/playground/infinite-canvas'
import { ShapesToolbar, ShapeType } from '@/components/playground/shapes-toolbar'
import { WidgetModal, WidgetType } from '@/components/playground/widget-modal'

interface Page {
  id: string
  name: string
  elements: CanvasElement[]
}

interface CanvasElement {
  id: string
  type: 'text' | 'shape' | 'widget' | 'drawing'
  x: number
  y: number
  width?: number
  height?: number
  content?: any
}

export default function PlaygroundPage() {
  const [pages, setPages] = useState<Page[]>([
    { id: '1', name: 'Page 1', elements: [] }
  ])
  const [currentPageId, setCurrentPageId] = useState('1')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false)
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle')

  const currentPage = pages.find(p => p.id === currentPageId)

  const addNewPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: `Page ${pages.length + 1}`,
      elements: []
    }
    setPages([...pages, newPage])
    setCurrentPageId(newPage.id)
  }

  const addElement = (type: CanvasElement['type'], position: { x: number, y: number }, content?: any) => {
    if (!currentPage) return

    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type,
      x: position.x,
      y: position.y,
      width: type === 'widget' ? 300 : 100,
      height: type === 'widget' ? 200 : 100,
      content
    }

    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    }

    setPages(pages.map(p => p.id === currentPage.id ? updatedPage : p))
  }

  const handleCreateWidget = (type: WidgetType, metric: string) => {
    addElement('widget', { x: 0, y: 0 }, { widgetType: type, metric })
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main container below topbar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Pages */}
        <div className={cn(
          "bg-card border-r transition-all duration-300 flex flex-col",
          isSidebarOpen ? "w-64" : "w-0"
        )}>
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
        </div>

        {/* Toggle sidebar button when closed */}
        {!isSidebarOpen && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-2 top-2 z-10"
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
            onCanvasClick={(e, worldPos) => {
              // Handle canvas clicks based on selected tool
              if (selectedTool === 'text') {
                addElement('text', worldPos, 'New Text')
              } else if (selectedTool === 'shapes') {
                addElement('shape', worldPos, { shapeType: selectedShape })
              }
            }}
          >
            {/* Canvas elements */}
            {currentPage?.elements.map(element => (
              <div
                key={element.id}
                className="absolute border-2 border-primary/50 rounded-md p-2 bg-card"
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width || 100,
                  height: element.height || 100
                }}
              >
                {/* Element content */}
                {element.type === 'text' && (
                  <div className="p-2">{element.content || 'Text'}</div>
                )}
                {element.type === 'shape' && (
                  <div className="w-full h-full flex items-center justify-center">
                    {element.content?.shapeType || 'Shape'}
                  </div>
                )}
                {element.type === 'widget' && (
                  <div className="w-full h-full p-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      {element.content?.widgetType} - {element.content?.metric}
                    </div>
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                      Chart Preview
                    </div>
                  </div>
                )}
              </div>
            ))}
          </InfiniteCanvas>

          {/* Zoom controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
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
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-card border rounded-full shadow-lg p-2 flex gap-1">
          <Button
            size="icon"
            variant={selectedTool === 'pencil' ? 'default' : 'ghost'}
            onClick={() => setSelectedTool('pencil')}
            className="rounded-full"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant={selectedTool === 'text' ? 'default' : 'ghost'}
            onClick={() => setSelectedTool('text')}
            className="rounded-full"
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
          
          <Button
            size="icon"
            variant={selectedTool === 'widget' ? 'default' : 'ghost'}
            onClick={() => setIsWidgetModalOpen(true)}
            className="rounded-full"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Widget Modal */}
      <WidgetModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onCreateWidget={handleCreateWidget}
      />
    </div>
  )
} 