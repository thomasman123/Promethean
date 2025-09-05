'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BarChart3, LineChart, AreaChart, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WidgetType = 'bar' | 'line' | 'area' | 'kpi'

interface WidgetModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateWidget: (type: WidgetType, metric: string) => void
}

const widgetTypes = [
  { type: 'bar' as WidgetType, icon: BarChart3, label: 'Bar Chart' },
  { type: 'line' as WidgetType, icon: LineChart, label: 'Line Chart' },
  { type: 'area' as WidgetType, icon: AreaChart, label: 'Area Chart' },
  { type: 'kpi' as WidgetType, icon: TrendingUp, label: 'KPI Tile' },
]

// Sample metrics - these would come from your metrics engine
const metrics = [
  { id: 'appointments_booked', label: 'Appointments Booked' },
  { id: 'dials_made', label: 'Dials Made' },
  { id: 'show_rate', label: 'Show Rate' },
  { id: 'speed_to_lead', label: 'Speed to Lead' },
  { id: 'answer_rate', label: 'Answer Rate' },
  { id: 'custom', label: 'Custom Metric...' },
]

export function WidgetModal({ isOpen, onClose, onCreateWidget }: WidgetModalProps) {
  const [selectedType, setSelectedType] = useState<WidgetType>('bar')
  const [selectedMetric, setSelectedMetric] = useState<string>('appointments_booked')

  const handleCreate = () => {
    onCreateWidget(selectedType, selectedMetric)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a visualization type and metric to display
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Widget Type Selection */}
          <div className="space-y-3">
            <Label>Visualization Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {widgetTypes.map((widget) => (
                <button
                  key={widget.type}
                  onClick={() => setSelectedType(widget.type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                    selectedType === widget.type
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <widget.icon className="h-8 w-8" />
                  <span className="text-sm font-medium">{widget.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selection */}
          <div className="space-y-3">
            <Label>Select Metric</Label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((metric) => (
                  <SelectItem key={metric.id} value={metric.id}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Widget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 