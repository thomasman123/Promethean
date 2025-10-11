"use client"

import { useState, useEffect } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { MetricWidget } from '@/components/dashboard/metric-widget'
import { BarChartWidget } from '@/components/dashboard/bar-chart-widget'
import { LineChartWidget } from '@/components/dashboard/line-chart-widget'
import { AreaChartWidget } from '@/components/dashboard/area-chart-widget'
import { DataViewWidget } from '@/components/dashboard/data-view-widget'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'

export interface PlaygroundWidgetConfig {
  widgetType: 'kpi' | 'bar' | 'line' | 'area' | 'data'
  metric?: string
  metrics?: string[]
  dateRange: {
    from: Date
    to: Date
  }
  options?: Record<string, any>
  selectedUsers?: string[]
}

interface PlaygroundWidgetProps {
  config: PlaygroundWidgetConfig
  width?: number
  height?: number
  onConfigChange?: (config: PlaygroundWidgetConfig) => void
}

export function PlaygroundWidget({ config, width, height, onConfigChange }: PlaygroundWidgetProps) {
  const { selectedAccountId } = useDashboard()
  const [localDateRange, setLocalDateRange] = useState(config.dateRange)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  useEffect(() => {
    setLocalDateRange(config.dateRange)
  }, [config.dateRange])

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const newRange = {
      from: range.from || startOfMonth(today),
      to: (range.to && range.to <= today) ? range.to : today
    }
    
    setLocalDateRange(newRange)
    
    if (onConfigChange) {
      onConfigChange({
        ...config,
        dateRange: newRange
      })
    }
  }

  if (!selectedAccountId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Select an account to view data</p>
      </div>
    )
  }

  return (
    <div 
      className="h-full w-full bg-background rounded-lg border shadow-sm flex flex-col overflow-hidden"
      style={{ width, height }}
    >
      {/* Date Range Picker Header */}
      <div className="px-3 py-2 border-b bg-muted/10 flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {config.widgetType === 'kpi' && 'Metric'}
          {config.widgetType === 'bar' && 'Bar Chart'}
          {config.widgetType === 'line' && 'Line Chart'}
          {config.widgetType === 'area' && 'Area Chart'}
          {config.widgetType === 'data' && 'Data View'}
        </span>
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-xs justify-start text-left font-normal",
                !localDateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {localDateRange?.from ? (
                localDateRange.to ? (
                  <>
                    {format(localDateRange.from, "MMM d")} -{" "}
                    {format(localDateRange.to, "MMM d, yyyy")}
                  </>
                ) : (
                  format(localDateRange.from, "MMM d, yyyy")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={localDateRange?.from}
              selected={{ from: localDateRange?.from, to: localDateRange?.to }}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Widget Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DashboardWidgetContent 
          config={config}
          accountId={selectedAccountId}
          dateRange={localDateRange}
        />
      </div>
    </div>
  )
}

interface DashboardWidgetContentProps {
  config: PlaygroundWidgetConfig
  accountId: string
  dateRange: { from: Date; to: Date }
}

function DashboardWidgetContent({ config, accountId, dateRange }: DashboardWidgetContentProps) {
  // Create a temporary dashboard context for the widget
  const contextValue = {
    selectedAccountId: accountId,
    dateRange,
    setDateRange: () => {},
    currentViewId: '',
    setCurrentViewId: () => {},
    setSelectedAccountId: () => {},
    selectedCountries: null,
    setSelectedCountries: () => {}
  }

  // Render the appropriate widget type
  if (config.widgetType === 'kpi' && config.metric) {
    return (
      <div className="h-full p-4">
        <MetricWidget
          metric={config.metric}
          type="kpi"
          options={config.options}
        />
      </div>
    )
  }

  if (config.widgetType === 'bar' && config.metrics) {
    return (
      <div className="h-full p-2">
        <BarChartWidget
          metrics={config.metrics}
          options={config.options}
        />
      </div>
    )
  }

  if (config.widgetType === 'line' && config.metrics) {
    return (
      <div className="h-full p-2">
        <LineChartWidget
          metrics={config.metrics}
          options={config.options}
        />
      </div>
    )
  }

  if (config.widgetType === 'area' && config.metrics) {
    return (
      <div className="h-full p-2">
        <AreaChartWidget
          metrics={config.metrics}
          options={config.options}
        />
      </div>
    )
  }

  if (config.widgetType === 'data' && config.metrics && config.selectedUsers) {
    return (
      <div className="h-full p-2">
        <DataViewWidget
          metrics={config.metrics}
          selectedUsers={config.selectedUsers}
          options={config.options}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Invalid widget configuration</p>
    </div>
  )
}

