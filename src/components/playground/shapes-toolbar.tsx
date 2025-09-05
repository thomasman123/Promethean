'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Square, Circle, Triangle, ArrowRight, Hexagon, Star } from 'lucide-react'

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'hexagon' | 'star'

interface ShapesToolbarProps {
  onSelectShape: (shape: ShapeType) => void
  isActive: boolean
}

const shapes = [
  { type: 'rectangle' as ShapeType, icon: Square, label: 'Rectangle' },
  { type: 'circle' as ShapeType, icon: Circle, label: 'Circle' },
  { type: 'triangle' as ShapeType, icon: Triangle, label: 'Triangle' },
  { type: 'arrow' as ShapeType, icon: ArrowRight, label: 'Arrow' },
  { type: 'hexagon' as ShapeType, icon: Hexagon, label: 'Hexagon' },
  { type: 'star' as ShapeType, icon: Star, label: 'Star' },
]

export function ShapesToolbar({ onSelectShape, isActive }: ShapesToolbarProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle')
  const SelectedIcon = shapes.find(s => s.type === selectedShape)?.icon || Square

  const handleSelectShape = (shape: ShapeType) => {
    setSelectedShape(shape)
    onSelectShape(shape)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant={isActive ? 'default' : 'ghost'}
          className="rounded-full"
        >
          <SelectedIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="mb-2">
        <div className="grid grid-cols-3 gap-1 p-1">
          {shapes.map((shape) => (
            <DropdownMenuItem
              key={shape.type}
              onClick={() => handleSelectShape(shape.type)}
              className="flex items-center justify-center p-2 cursor-pointer"
            >
              <shape.icon className="h-5 w-5" />
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 