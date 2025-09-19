"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Legend } from "recharts"
import { format, eachDayOfInterval, parseISO, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, differenceInDays, endOfWeek, endOfMonth } from "date-fns"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { useDashboard } from "@/lib/dashboard-context"
import { TimeResult } from "@/lib/metrics/types"

interface BarChartWidgetProps {
  metrics: string[]
}

type AggregationType = 'daily' | 'weekly' | 'monthly'

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
]

export function BarChartWidget({ metrics }: BarChartWidgetProps) {
  const [data, setData] = useState<Array<Record<string, any>>>([])
  const [loading, setLoading] = useState(true)
  const { selectedAccountId, dateRange } = useDashboard()

  // Determine aggregation type based on date range
  const getAggregationType = (): AggregationType => {
    if (!dateRange.from || !dateRange.to) return 'daily'
    
    const daysDiff = differenceInDays(dateRange.to, dateRange.from)
    
    if (daysDiff <= 14) {
      return 'daily'
    } else if (daysDiff <= 90) {
      return 'weekly'
    } else {
      return 'monthly'
    }
  }

  useEffect(() => {
    if (selectedAccountId && metrics.length > 0 && dateRange.from && dateRange.to) {
      fetchMetricsData()
    }
  }, [selectedAccountId, metrics, dateRange])

  const fetchMetricsData = async () => {
    setLoading(true)
    try {
      const aggregationType = getAggregationType()
      
      // Fetch data for all metrics
      const metricsData = await Promise.all(
        metrics.map(async (metric) => {
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
              vizType: 'bar'
            })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.result?.type === 'time' && result.result.data) {
              return {
                metric,
                data: result.result.data as TimeResult['data']
              }
            }
          }
          return { metric, data: [] }
        })
      )

      // Get all date points
      let datePoints: Array<{ date: string; label: string }> = []
      
      if (aggregationType === 'daily') {
        const allDays = eachDayOfInterval({
          start: dateRange.from,
          end: dateRange.to
        })
        datePoints = allDays.map(day => ({
          date: format(day, 'yyyy-MM-dd'),
          label: format(day, 'MMM dd')
        }))
      } else if (aggregationType === 'weekly') {
        const weeks = eachWeekOfInterval({
          start: dateRange.from,
          end: dateRange.to
        }, { weekStartsOn: 0 })
        datePoints = weeks.map(weekStart => ({
          date: format(weekStart, 'yyyy-MM-dd'),
          label: `Week ${format(weekStart, 'w')}`
        }))
      } else {
        const months = eachMonthOfInterval({
          start: dateRange.from,
          end: dateRange.to
        })
        datePoints = months.map(monthStart => ({
          date: format(monthStart, 'yyyy-MM-dd'),
          label: format(monthStart, 'MMM yyyy')
        }))
      }

      // Aggregate data for weekly/monthly
      const aggregatedMetricsData = metricsData.map(({ metric, data }) => {
        if (aggregationType === 'daily') {
          return { metric, data }
        }

        // Aggregate data for weekly/monthly
        const aggregatedData = datePoints.map(point => {
          if (aggregationType === 'weekly') {
            const weekStart = parseISO(point.date)
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
            
            const weekData = data.filter(d => {
              const date = parseISO(d.date)
              return date >= weekStart && date <= weekEnd && 
                     date >= dateRange.from && date <= dateRange.to
            })
            
            const sum = weekData.reduce((acc, d) => acc + d.value, 0)
            return { date: point.date, value: sum }
          } else {
            // Monthly aggregation
            const monthStart = parseISO(point.date)
            const monthEnd = endOfMonth(monthStart)
            
            const monthData = data.filter(d => {
              const date = parseISO(d.date)
              return date >= monthStart && date <= monthEnd && 
                     date >= dateRange.from && date <= dateRange.to
            })
            
            const sum = monthData.reduce((acc, d) => acc + d.value, 0)
            return { date: point.date, value: sum }
          }
        })

        return { metric, data: aggregatedData }
      })

      // Combine data from all metrics
      const combinedData = datePoints.map(point => {
        const dataPoint: Record<string, any> = {
          date: point.date,
          label: point.label
        }

        aggregatedMetricsData.forEach(({ metric, data }) => {
          const metricData = data.find(d => d.date === point.date)
          dataPoint[metric] = metricData?.value || 0
        })

        return dataPoint
      })

      setData(combinedData)
    } catch (error) {
      console.error('Failed to fetch metrics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (val: number, metric: string): string => {
    const metricInfo = METRICS_REGISTRY[metric]
    if (!metricInfo) return val.toString()

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

  // Build chart config for all metrics and determine axis groupings
  const chartConfig: ChartConfig = {}
  const percentageMetrics: string[] = []
  const numberMetrics: string[] = [] // count metrics
  const currencyMetrics: string[] = []
  const timeMetrics: string[] = [] // seconds, days
  
  metrics.forEach((metric, index) => {
    const metricInfo = METRICS_REGISTRY[metric]
    chartConfig[metric] = {
      label: metricInfo?.name || metric,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
    
    if (metricInfo?.unit === 'percent') {
      percentageMetrics.push(metric)
    } else if (metricInfo?.unit === 'currency') {
      currencyMetrics.push(metric)
    } else if (metricInfo?.unit === 'seconds' || metricInfo?.unit === 'days') {
      timeMetrics.push(metric)
    } else {
      numberMetrics.push(metric) // count and other numeric types
    }
  })
  
  const hasPercentages = percentageMetrics.length > 0
  const hasNumbers = numberMetrics.length > 0
  const hasCurrency = currencyMetrics.length > 0
  const hasTime = timeMetrics.length > 0
  const hasMultipleAxisTypes = [hasPercentages, hasNumbers, hasCurrency, hasTime].filter(Boolean).length > 1

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full [&>div]:!aspect-auto">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          top: 25,
          right: hasPercentages ? 50 : ((hasCurrency || hasTime) && hasNumbers ? 50 : 5),
          left: (hasNumbers || hasCurrency || hasTime) && !hasPercentages ? -5 : 5,
          bottom: metrics.length > 1 ? 40 : 25,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          angle={data.length > 10 ? -45 : 0}
          textAnchor={data.length > 10 ? "end" : "middle"}
          height={data.length > 10 ? 50 : 25}
        />
        {/* Primary Y-axis for count numbers */}
        {hasNumbers && (
          <YAxis
            yAxisId="numbers"
            tickLine={false}
            axisLine={false}
            width={45}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value.toLocaleString('en-US', { notation: 'compact' })}
          />
        )}
        {/* Secondary Y-axis for currency */}
        {hasCurrency && (
          <YAxis
            yAxisId="currency"
            orientation={hasNumbers ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={45}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${value.toLocaleString('en-US', { notation: 'compact' })}`}
          />
        )}
        {/* Time Y-axis for seconds/days */}
        {hasTime && (
          <YAxis
            yAxisId="time"
            orientation={(hasNumbers || hasCurrency) ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={45}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => {
              // Format based on the first time metric
              const firstTimeMetric = timeMetrics[0]
              const metricInfo = METRICS_REGISTRY[firstTimeMetric]
              if (metricInfo?.unit === 'seconds') {
                if (value < 60) return `${value.toFixed(0)}s`
                if (value < 3600) return `${(value / 60).toFixed(0)}m`
                return `${(value / 3600).toFixed(1)}h`
              } else if (metricInfo?.unit === 'days') {
                return `${value.toFixed(1)}d`
              }
              return value.toLocaleString('en-US', { notation: 'compact' })
            }}
          />
        )}
        {/* Tertiary Y-axis for percentages */}
        {hasPercentages && (
          <YAxis
            yAxisId="percentages"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={45}
            tick={{ fontSize: 11 }}
            domain={[0, 1]}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
        )}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent 
              formatter={(value, name) => {
                const metricInfo = METRICS_REGISTRY[name as string]
                const axisIndicator = hasMultipleAxisTypes ? 
                  (metricInfo?.unit === 'currency' ? ' 💰' : 
                   metricInfo?.unit === 'percent' ? ' 📊' : 
                   (metricInfo?.unit === 'seconds' || metricInfo?.unit === 'days') ? ' ⏱️' : ' 📈') : ''
                return [
                  formatValue(value as number, name as string), 
                  (metricInfo?.name || name) + axisIndicator
                ]
              }}
            />
          }
        />
        {metrics.map((metric, index) => {
          const metricInfo = METRICS_REGISTRY[metric]
          const unit = metricInfo?.unit
          let yAxisId = "numbers" // default
          
          if (unit === 'percent') {
            yAxisId = "percentages"
          } else if (unit === 'currency') {
            yAxisId = "currency"
          } else if (unit === 'seconds' || unit === 'days') {
            yAxisId = "time"
          } else {
            yAxisId = "numbers" // count and other numeric types
          }
          
          return (
            <Bar 
              key={metric}
              dataKey={metric} 
              fill={`var(--color-${metric})`} 
              radius={[4, 4, 0, 0]}
              yAxisId={yAxisId}
            />
          )
        })}
        {metrics.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
      </BarChart>
    </ChartContainer>
  )
} 