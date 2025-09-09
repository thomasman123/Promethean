"use client"

import { useState, useEffect } from "react"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { useDashboard } from "@/lib/dashboard-context"
import { format } from "date-fns"

interface MetricWidgetProps {
  metric?: string // For KPI widgets
  metrics?: string[] // For chart widgets
  type: "kpi" | "bar" | "line" | "area"
  options?: Record<string, any> // Widget options/settings
}

export function MetricWidget({ metric, metrics, type, options }: MetricWidgetProps) {
  const [value, setValue] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { selectedAccountId, dateRange } = useDashboard()
  
  const metricInfo = metric ? METRICS_REGISTRY[metric] : null

  useEffect(() => {
    if (selectedAccountId && metric && dateRange.from && dateRange.to) {
      fetchMetricData()
    }
  }, [selectedAccountId, metric, dateRange])

  const fetchMetricData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricName: metric,
          filters: {
            accountId: selectedAccountId,
            dateRange: {
              start: format(dateRange.from, 'yyyy-MM-dd'),
              end: format(dateRange.to, 'yyyy-MM-dd')
            }
          },
          options: {
            vizType: type,
            widgetSettings: options
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.result?.type === 'total' && data.result.data?.value !== undefined) {
          setValue(data.result.data.value)
        }
      }
    } catch (error) {
      console.error('Failed to fetch metric data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (val: number): string => {
    if (!metricInfo) return val.toString()

    // Special handling for Speed to Lead with time format option
    if (metric === 'speed_to_lead' && options?.speedToLeadTimeFormat) {
      const hours = Math.floor(val / 3600)
      const minutes = Math.floor((val % 3600) / 60)
      const seconds = Math.floor(val % 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
      } else {
        return `${seconds}s`
      }
    }

    switch (metricInfo.unit) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      case 'percent':
        return `${(val * 100).toFixed(1)}%`
      case 'seconds':
        if (val < 60) {
          return `${val.toFixed(0)}s`
        } else if (val < 3600) {
          return `${(val / 60).toFixed(1)}m`
        } else {
          return `${(val / 3600).toFixed(1)}h`
        }
      case 'days':
        return `${val.toFixed(1)}d`
      case 'count':
      default:
        return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
  }

  if (type === "kpi") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl lg:text-4xl xl:text-5xl font-bold">
            {loading ? (
              <span className="text-muted-foreground">...</span>
            ) : value !== null ? (
              formatValue(value)
            ) : (
              '--'
            )}
          </div>
        </div>
      </div>
    )
  }

  // Chart types - dynamically import the appropriate chart component
  if (type === "bar" && metrics) {
    const BarChartWidget = require('./bar-chart-widget').BarChartWidget
    return <BarChartWidget metrics={metrics} options={options} />
  }
  
  if (type === "line" && metrics) {
    const LineChartWidget = require('./line-chart-widget').LineChartWidget
    return <LineChartWidget metrics={metrics} options={options} />
  }
  
  if (type === "area" && metrics) {
    const AreaChartWidget = require('./area-chart-widget').AreaChartWidget
    return <AreaChartWidget metrics={metrics} options={options} />
  }
  
  // Other chart types placeholder
  return (
    <div className="h-full flex items-center justify-center">
      <span className="text-muted-foreground text-sm">
        {loading ? 'Loading...' : `${metricInfo?.name || metric} ${type} chart (coming soon)`}
      </span>
    </div>
  )
} 