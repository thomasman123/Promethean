"use client"

import { memo, useState } from 'react'
import { NodeProps } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import { MetricWidget } from '@/components/dashboard/metric-widget'
import { Calendar, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'

export interface WidgetNodeData {
  widgetConfig: {
    id: string
    type: 'kpi' | 'bar' | 'line' | 'area' | 'data'
    title: string
    metric?: string
    metrics?: string[]
    metricOptions?: Record<string, any>
    metricsOptions?: Record<string, Record<string, any>>
    selectedUsers?: string[]
    dateRange?: {
      from: Date
      to: Date
    }
  }
  onDateRangeChange?: (range: { from: Date; to: Date }) => void
  onEdit?: () => void
}

export const CanvasWidgetNode = memo(({ data, selected }: NodeProps<WidgetNodeData>) => {
  const { widgetConfig, onDateRangeChange, onEdit } = data
  
  // Safety check for widgetConfig
  if (!widgetConfig) {
    return (
      <div className="w-full h-full bg-background border-2 border-border rounded-lg shadow-md p-4 flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Invalid widget configuration</span>
      </div>
    )
  }
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    widgetConfig.dateRange
      ? { from: new Date(widgetConfig.dateRange.from), to: new Date(widgetConfig.dateRange.to) }
      : undefined
  )

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to && onDateRangeChange) {
      onDateRangeChange({ from: range.from, to: range.to })
    }
  }

  return (
    <div className="relative w-full h-full bg-background border-2 border-border rounded-lg shadow-md overflow-hidden">
      <NodeResizer
        color={selected ? "#3b82f6" : "transparent"}
        isVisible={selected}
        minWidth={300}
        minHeight={200}
      />
      
      {/* Widget Header */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <h3 className="text-xs font-medium truncate flex-1">{widgetConfig.title}</h3>
        <div className="flex items-center gap-1">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                <Calendar className="h-3 w-3 mr-1" />
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                  : 'Set dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Settings */}
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-3 h-[calc(100%-40px)] overflow-auto">
        <MetricWidget
          metric={widgetConfig.metric}
          metrics={widgetConfig.metrics}
          type={widgetConfig.type}
          options={widgetConfig.metricOptions}
          selectedUsers={widgetConfig.selectedUsers}
        />
      </div>
    </div>
  )
})

CanvasWidgetNode.displayName = 'CanvasWidgetNode'

