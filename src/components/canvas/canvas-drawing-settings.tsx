"use client"

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Palette } from 'lucide-react'

interface CanvasDrawingSettingsProps {
  strokeColor: string
  onStrokeColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (width: number) => void
  fillColor: string
  onFillColorChange: (color: string) => void
}

const colors = [
  '#000000', // Black
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ffffff', // White
]

export function CanvasDrawingSettings({
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fillColor,
  onFillColorChange,
}: CanvasDrawingSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Stroke Color</Label>
            <div className="grid grid-cols-9 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    borderColor: strokeColor === color ? '#3b82f6' : '#d1d5db',
                  }}
                  onClick={() => onStrokeColorChange(color)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Fill Color</Label>
            <div className="grid grid-cols-9 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    borderColor: fillColor === color ? '#3b82f6' : '#d1d5db',
                  }}
                  onClick={() => onFillColorChange(color)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Stroke Width: {strokeWidth}px</Label>
            <Slider
              value={[strokeWidth]}
              onValueChange={(value) => onStrokeWidthChange(value[0])}
              min={1}
              max={10}
              step={1}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

