"use client"

import { useCallback, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CanvasShapeNode } from './canvas-shape-node'
import { CanvasTextNode } from './canvas-text-node'
import { CanvasStickyNoteNode } from './canvas-sticky-note-node'
import { CanvasWidgetNode } from './canvas-widget-node'
import { CanvasFreehandNode } from './canvas-freehand-node'
import { useCanvas } from '@/lib/canvas-context'
import { useCanvasKeyboard } from '@/hooks/use-canvas-keyboard'
import { ToolType } from './canvas-toolbar'

const nodeTypes: NodeTypes = {
  shape: CanvasShapeNode,
  text: CanvasTextNode,
  'sticky-note': CanvasStickyNoteNode,
  widget: CanvasWidgetNode,
  freehand: CanvasFreehandNode,
}

interface CanvasFlowContentProps {
  selectedTool: ToolType
  onWidgetToolClick: () => void
  onSelectionChange: (hasSelection: boolean) => void
  onDeleteSelection: () => void
  strokeColor: string
  strokeWidth: number
  fillColor: string
}

function CanvasFlowContent({ 
  selectedTool, 
  onWidgetToolClick,
  onSelectionChange,
  onDeleteSelection,
  strokeColor,
  strokeWidth,
  fillColor,
}: CanvasFlowContentProps) {
  const { elements, updateElement, addElement, deleteElement, selectedBoardId } = useCanvas()
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [copiedElements, setCopiedElements] = useState<any[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [drawingStartPos, setDrawingStartPos] = useState<{ x: number; y: number } | null>(null)
  
  const { screenToFlowPosition } = useReactFlow()
  const updateTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Convert canvas elements to React Flow nodes and edges
  useEffect(() => {
    if (!selectedBoardId) {
      setNodes([])
      setEdges([])
      return
    }

    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []

    elements.forEach((el) => {
      if (el.type === 'arrow') {
        // Convert arrow elements to edges
        flowEdges.push({
          id: el.id,
          source: el.element_data.source,
          target: el.element_data.target,
          type: el.element_data.edgeType || 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: el.style?.stroke || '#000',
          },
          style: el.style,
        })
      } else {
        // Convert other elements to nodes
        const nodeData = el.type === 'widget' 
          ? { widgetConfig: el.widget_config, ...el.element_data }
          : el.element_data
          
        flowNodes.push({
          id: el.id,
          type: el.type,
          position: el.position,
          data: nodeData,
          style: {
            width: el.size?.width || 200,
            height: el.size?.height || 100,
          },
        })
      }
    })

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [elements, selectedBoardId, setNodes, setEdges])

  // Handle node changes (position, size, etc.) - REMOVED dimension updates to prevent infinite loop
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes)
    
    // Only update position when drag ends (not dimensions - causes loop)
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        // Clear existing timeout
        if (updateTimeouts.current[change.id]) {
          clearTimeout(updateTimeouts.current[change.id])
        }
        
        // Debounce the update
        updateTimeouts.current[change.id] = setTimeout(() => {
          updateElement(change.id, { position: change.position })
          delete updateTimeouts.current[change.id]
        }, 500)
      }
    })
  }, [onNodesChange, updateElement])

  // Handle selection changes
  useEffect(() => {
    const selected = nodes.filter(n => n.selected)
    setSelectedNodes(selected.map(n => n.id))
    onSelectionChange(selected.length > 0)
  }, [nodes, onSelectionChange])

  // Handle delete selected elements
  const handleDelete = useCallback(() => {
    if (selectedNodes.length === 0) return
    
    selectedNodes.forEach(nodeId => {
      deleteElement(nodeId)
    })
    
    setSelectedNodes([])
  }, [selectedNodes, deleteElement])

  // Handle copy
  const handleCopy = useCallback(() => {
    const selected = nodes.filter(n => selectedNodes.includes(n.id))
    if (selected.length === 0) return
    
    const elementsToCopy = selected.map(node => {
      const element = elements.find(el => el.id === node.id)
      return element
    }).filter(Boolean)
    
    setCopiedElements(elementsToCopy)
  }, [selectedNodes, nodes, elements])

  // Handle paste
  const handlePaste = useCallback(() => {
    if (copiedElements.length === 0 || !selectedBoardId) return
    
    copiedElements.forEach(element => {
      if (!element) return
      
      addElement({
        board_id: selectedBoardId,
        type: element.type,
        element_data: element.element_data,
        widget_config: element.widget_config,
        position: {
          x: element.position.x + 20,
          y: element.position.y + 20,
        },
        size: element.size,
        style: element.style,
        z_index: elements.length,
        created_by: '',
      })
    })
  }, [copiedElements, selectedBoardId, addElement, elements.length])

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    handleCopy()
    setTimeout(() => handlePaste(), 100)
  }, [handleCopy, handlePaste])

  // Keyboard shortcuts
  useCanvasKeyboard({
    onDelete: handleDelete,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDuplicate: handleDuplicate,
    onEscape: () => {
      setNodes(nodes.map(n => ({ ...n, selected: false })))
    },
  })

  // Freehand drawing handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (selectedTool !== 'pen') return
    if (!selectedBoardId) return

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    setIsDrawing(true)
    setDrawingStartPos(position)
    setCurrentPath([position])
  }, [selectedTool, selectedBoardId, screenToFlowPosition])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDrawing || selectedTool !== 'pen') return

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    setCurrentPath(prev => [...prev, position])
  }, [isDrawing, selectedTool, screenToFlowPosition])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !selectedBoardId || currentPath.length < 2) {
      setIsDrawing(false)
      setCurrentPath([])
      setDrawingStartPos(null)
      return
    }

    // Convert path to SVG path string
    const pathData = currentPath.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`
      }
      return `${acc} L ${point.x} ${point.y}`
    }, '')

    // Calculate bounding box
    const minX = Math.min(...currentPath.map(p => p.x))
    const minY = Math.min(...currentPath.map(p => p.y))
    const maxX = Math.max(...currentPath.map(p => p.x))
    const maxY = Math.max(...currentPath.map(p => p.y))

    // Create freehand node
    addElement({
      board_id: selectedBoardId,
      type: 'shape', // Use shape type with freehand data
      element_data: {
        shape: 'freehand',
        path: pathData,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: 'none',
        opacity: 1,
      },
      position: { x: minX, y: minY },
      size: { width: maxX - minX + 10, height: maxY - minY + 10 },
      z_index: elements.length,
      created_by: '',
    })

    setIsDrawing(false)
    setCurrentPath([])
    setDrawingStartPos(null)
  }, [isDrawing, selectedBoardId, currentPath, addElement, elements.length])

  // Handle canvas click to add elements - INSTANT PLACEMENT
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (!selectedBoardId) return
    
    // Skip for tools that don't place on click
    if (selectedTool === 'select' || selectedTool === 'arrow' || selectedTool === 'pen' || selectedTool === 'eraser') return
    
    // Widget tool opens picker
    if (selectedTool === 'widget') {
      onWidgetToolClick()
      return
    }

    // Get the exact click position
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    let elementData: any = {}
    let size = { width: 200, height: 100 }

    // Place element immediately at click position
    switch (selectedTool) {
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'hexagon':
        elementData = {
          shape: selectedTool,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          opacity: 1,
        }
        size = { width: 150, height: 150 }
        addElement({
          board_id: selectedBoardId,
          type: 'shape',
          element_data: elementData,
          position,
          size,
          z_index: elements.length,
          created_by: '',
        })
        break

      case 'text':
        elementData = {
          text: 'Double click to edit',
          fontSize: 16,
          fontWeight: 'normal',
          color: strokeColor,
          align: 'left',
        }
        size = { width: 200, height: 60 }
        addElement({
          board_id: selectedBoardId,
          type: 'text',
          element_data: elementData,
          position,
          size,
          z_index: elements.length,
          created_by: '',
        })
        break

      case 'sticky-note':
        elementData = {
          text: '',
          color: 'yellow',
        }
        size = { width: 200, height: 200 }
        addElement({
          board_id: selectedBoardId,
          type: 'sticky-note',
          element_data: elementData,
          position,
          size,
          z_index: elements.length,
          created_by: '',
        })
        break
    }
  }, [selectedTool, selectedBoardId, screenToFlowPosition, addElement, elements.length, onWidgetToolClick, strokeColor, strokeWidth, fillColor])

  // Handle edge connections
  const onConnect = useCallback((connection: Connection) => {
    if (!selectedBoardId) return

    setEdges((eds) => addEdge(connection, eds))

    // Save to backend
    addElement({
      board_id: selectedBoardId,
      type: 'arrow',
      element_data: {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      },
      position: { x: 0, y: 0 },
      style: {
        stroke: '#000000',
        strokeWidth: 2,
      },
      z_index: elements.length,
      created_by: '',
    })
  }, [selectedBoardId, setEdges, addElement, elements.length])

  // Determine interaction modes based on selected tool (MOVED BEFORE EARLY RETURN)
  const isPanningEnabled = selectedTool === 'select'
  const isDrawingTool = selectedTool === 'pen'
  const isEraserTool = selectedTool === 'eraser'
  const isPlacementTool = ['rectangle', 'circle', 'triangle', 'diamond', 'hexagon', 'text', 'sticky-note', 'widget'].includes(selectedTool)

  // Eraser mode - delete nodes on click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (selectedTool === 'eraser') {
      deleteElement(node.id)
    }
  }, [selectedTool, deleteElement])

  // NOW check for early return AFTER all hooks
  if (!selectedBoardId) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <p className="text-muted-foreground">Select or create a board to get started</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full"
      onMouseDown={isDrawingTool ? handleMouseDown : undefined}
      onMouseMove={isDrawingTool ? handleMouseMove : undefined}
      onMouseUp={isDrawingTool ? handleMouseUp : undefined}
      onMouseLeave={isDrawingTool ? handleMouseUp : undefined}
      style={{
        cursor: isEraserTool ? 'crosshair' : isPlacementTool ? 'crosshair' : isDrawingTool ? 'crosshair' : 'default'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView={false}
        snapToGrid
        snapGrid={[15, 15]}
        panOnDrag={isPanningEnabled ? [1, 2] : false}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnDoubleClick={false}
        nodesDraggable={isPanningEnabled}
        nodesConnectable={selectedTool === 'arrow'}
        elementsSelectable={true}
        selectNodesOnDrag={isPanningEnabled}
        defaultEdgeOptions={{
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        
        {/* Show current drawing path */}
        {isDrawing && currentPath.length > 1 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <path
              d={currentPath.reduce((acc, point, index) => {
                if (index === 0) return `M ${point.x} ${point.y}`
                return `${acc} L ${point.x} ${point.y}`
              }, '')}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </ReactFlow>
    </div>
  )
}

interface CanvasFlowProps {
  selectedTool: ToolType
  onWidgetToolClick: () => void
  onSelectionChange: (hasSelection: boolean) => void
  onDeleteSelection: () => void
  strokeColor: string
  strokeWidth: number
  fillColor: string
}

export function CanvasFlow(props: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlowContent {...props} />
    </ReactFlowProvider>
  )
}

