"use client"

import { AddWidgetModal, WidgetConfig } from '@/components/dashboard/add-widget-modal'

interface CanvasWidgetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widget: WidgetConfig) => void
}

export function CanvasWidgetPicker({ open, onOpenChange, onAddWidget }: CanvasWidgetPickerProps) {
  return (
    <AddWidgetModal
      open={open}
      onOpenChange={onOpenChange}
      onAddWidget={onAddWidget}
    />
  )
}

