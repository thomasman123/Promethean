"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CanvasShapeNode } from '@/components/canvas/canvas-shape-node'
import { CanvasTextNode } from '@/components/canvas/canvas-text-node'
import { CanvasStickyNoteNode } from '@/components/canvas/canvas-sticky-note-node'
import { CanvasWidgetNode } from '@/components/canvas/canvas-widget-node'
import { Loading } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock } from 'lucide-react'

const nodeTypes: NodeTypes = {
  shape: CanvasShapeNode,
  text: CanvasTextNode,
  'sticky-note': CanvasStickyNoteNode,
  widget: CanvasWidgetNode,
}

function PublicCanvasContent() {
  const params = useParams()
  const boardId = params.boardId as string
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [boardName, setBoardName] = useState<string>('')

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch(`/api/canvas/public/${boardId}`)
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('This board is not publicly accessible')
          } else if (response.status === 404) {
            setError('Board not found')
          } else {
            setError('Failed to load board')
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        setBoardName(data.board.name)

        // Convert elements to React Flow nodes and edges
        const flowNodes: Node[] = []
        const flowEdges: Edge[] = []

        data.elements.forEach((el: any) => {
          if (el.type === 'arrow') {
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
      } catch (err) {
        console.error('Error fetching board:', err)
        setError('Failed to load board')
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
  }, [boardId, setNodes, setEdges])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading text="Loading board..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{boardName}</h1>
          <div className="text-sm text-muted-foreground">View Only</div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
        >
          <Controls showInteractive={false} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  )
}

export default function PublicCanvasPage() {
  return (
    <ReactFlowProvider>
      <PublicCanvasContent />
    </ReactFlowProvider>
  )
}

