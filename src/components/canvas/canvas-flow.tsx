"use client"

import { useCallback, useEffect, useState } from 'react'
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
import { useCanvas } from '@/lib/canvas-context'
import { useCanvasKeyboard } from '@/hooks/use-canvas-keyboard'
import { ToolType } from './canvas-toolbar'

const nodeTypes: NodeTypes = {
  shape: CanvasShapeNode,
  text: CanvasTextNode,
  'sticky-note': CanvasStickyNoteNode,
  widget: CanvasWidgetNode,
}

interface CanvasFlowContentProps {
  selectedTool: ToolType
  onWidgetToolClick: () => void
  onSelectionChange: (hasSelection: boolean) => void
  onDeleteSelection: () => void
}

function CanvasFlowContent({ 
  selectedTool, 
  onWidgetToolClick,
  onSelectionChange,
  onDeleteSelection
}: CanvasFlowContentProps) {
  const { elements, updateElement, addElement, deleteElement, selectedBoardId } = useCanvas()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [copiedElements, setCopiedElements] = useState<any[]>([])
  const { project } = useReactFlow()

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
        flowNodes.push({
          id: el.id,
          type: el.type,
          position: el.position,
          data: el.element_data,
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

  // Handle node changes (position, size, etc.)
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes)
    
    // Update backend on position/dimension changes
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        updateElement(change.id, { position: change.position })
      }
      if (change.type === 'dimensions' && change.dimensions) {
        updateElement(change.id, { 
          size: { width: change.dimensions.width, height: change.dimensions.height } 
        })
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

  // Handle canvas click to add elements
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (!selectedBoardId) return
    if (selectedTool === 'select') return
    if (selectedTool === 'widget') {
      onWidgetToolClick()
      return
    }

    const position = project({ x: event.clientX, y: event.clientY })

    let elementData: any = {}
    let size = { width: 200, height: 100 }

    switch (selectedTool) {
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'hexagon':
        elementData = {
          shape: selectedTool,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
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
          created_by: '', // Will be set by API
        })
        break

      case 'text':
        elementData = {
          text: 'Double click to edit',
          fontSize: 16,
          fontWeight: 'normal',
          color: '#000000',
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
  }, [selectedTool, selectedBoardId, project, addElement, elements.length, onWidgetToolClick])

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


  if (!selectedBoardId) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <p className="text-muted-foreground">Select or create a board to get started</p>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      snapToGrid
      snapGrid={[15, 15]}
      defaultEdgeOptions={{
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }}
    >
      <Controls />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
    </ReactFlow>
  )
}

interface CanvasFlowProps {
  selectedTool: ToolType
  onWidgetToolClick: () => void
  onSelectionChange: (hasSelection: boolean) => void
  onDeleteSelection: () => void
}

export function CanvasFlow(props: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlowContent {...props} />
    </ReactFlowProvider>
  )
}

