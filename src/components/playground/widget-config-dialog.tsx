"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { METRICS_REGISTRY } from '@/lib/metrics/registry'
import { startOfMonth } from 'date-fns'
import { PlaygroundWidgetConfig } from './playground-widget'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

interface WidgetConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: PlaygroundWidgetConfig) => void
}

export function WidgetConfigDialog({ isOpen, onClose, onConfirm }: WidgetConfigDialogProps) {
  const [widgetType, setWidgetType] = useState<'kpi' | 'bar' | 'line' | 'area' | 'data'>('kpi')
  const [selectedMetric, setSelectedMetric] = useState<string>('')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleConfirm = () => {
    const config: PlaygroundWidgetConfig = {
      widgetType,
      dateRange: {
        from: startOfMonth(today),
        to: today
      },
      options: {}
    }

    if (widgetType === 'kpi') {
      if (!selectedMetric) {
        alert('Please select a metric')
        return
      }
      config.metric = selectedMetric
    } else {
      if (selectedMetrics.length === 0) {
        alert('Please select at least one metric')
        return
      }
      config.metrics = selectedMetrics
    }

    if (widgetType === 'data') {
      config.selectedUsers = [] // Can be configured later
    }

    onConfirm(config)
    handleReset()
  }

  const handleReset = () => {
    setWidgetType('kpi')
    setSelectedMetric('')
    setSelectedMetrics([])
    onClose()
  }

  const handleMetricToggle = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    )
  }

  const availableMetrics = Object.entries(METRICS_REGISTRY).filter(
    ([key, metric]) => !metric.isHidden
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4 py-4">
          <div className="space-y-2">
            <Label>Widget Type</Label>
            <Select value={widgetType} onValueChange={(value: any) => setWidgetType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kpi">KPI Metric</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="data">Data View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {widgetType === 'kpi' ? (
            <div className="space-y-2">
              <Label>Select Metric</Label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {availableMetrics.map(([key, metric]) => (
                      <SelectItem key={key} value={key}>
                        {metric.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Metrics (select multiple)</Label>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {availableMetrics.map(([key, metric]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`metric-${key}`}
                        checked={selectedMetrics.includes(key)}
                        onCheckedChange={() => handleMetricToggle(key)}
                      />
                      <label
                        htmlFor={`metric-${key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {metric.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selectedMetrics.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

