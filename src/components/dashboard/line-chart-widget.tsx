"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
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
import { groupMetricsByAxis, getYAxisId, getAxisIndicator, calculateChartMargins, formatTimeValue } from "@/lib/chart-axis-utils"

interface LineChartWidgetProps {
  metrics: string[]
  options?: Record<string, any>
}

type AggregationType = 'daily' | 'weekly' | 'monthly'

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
]

export function LineChartWidget({ metrics, options }: LineChartWidgetProps) {
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
      
      // Determine base metric names to fetch (strip any suffixes by reading originalMetricName from options)
      const seriesKeys = metrics
      const baseMetricsSet = new Set<string>()
      seriesKeys.forEach(key => {
        const opt = options?.[key]
        const base = opt?.originalMetricName || key
        baseMetricsSet.add(base)
      })
      const baseMetrics = Array.from(baseMetricsSet)
      
      // Fetch data for all base metrics
      const baseMetricsData = await Promise.all(
        baseMetrics.map(async (metric) => {
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
              vizType: 'line'
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

      // Build date points
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

      // Aggregate data for weekly/monthly per base metric
      const aggregatedBaseData = baseMetricsData.map(({ metric, data }) => {
        if (aggregationType === 'daily') {
          return { metric, data }
        }

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

      // Combine into series rows and map each requested series key to base metric value
      const combinedData = datePoints.map(point => {
        const row: Record<string, any> = { date: point.date, label: point.label }

        seriesKeys.forEach(key => {
          const opt = options?.[key]
          const base = opt?.originalMetricName || key
          const baseSeries = aggregatedBaseData.find(b => b.metric === base)
          const baseValue = baseSeries?.data.find(d => d.date === point.date)?.value || 0
          row[key] = baseValue
        })

        return row
      })

      // Apply cumulative only to series that opted in
      const cumulativeEnabled: string[] = []
      if (options && typeof options === 'object') {
        Object.entries(options).forEach(([key, opt]) => {
          if ((opt as any)?.cumulative === true) cumulativeEnabled.push(key)
        })
      }
      if (cumulativeEnabled.length > 0) {
        const totals: Record<string, number> = {}
        cumulativeEnabled.forEach(k => { totals[k] = 0 })
        combinedData.forEach(row => {
          cumulativeEnabled.forEach(k => {
            if (typeof row[k] === 'number') {
              totals[k] += row[k]
              row[k] = totals[k]
            }
          })
        })
      }

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

  // Build chart config and group metrics by axis types
  const axisGrouping = groupMetricsByAxis(metrics)
  const { percentageMetrics, numberMetrics, currencyMetrics, timeMetrics, hasPercentages, hasNumbers, hasCurrency, hasTime, hasMultipleAxisTypes } = axisGrouping
  
  const chartConfig: ChartConfig = {}
  metrics.forEach((metric, index) => {
    const opt = options?.[metric]
    const baseMetricName = opt?.originalMetricName || metric
    const metricInfo = METRICS_REGISTRY[baseMetricName]
    chartConfig[metric] = {
      label: `${metricInfo?.name || baseMetricName}${opt?.cumulative ? ' (Accumulative)' : ''}`,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
  })

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full [&>div]:!aspect-auto">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          top: 10,
          right: hasPercentages ? 50 : (hasCurrency && hasNumbers ? 50 : 5),
          left: (hasNumbers || hasCurrency) && !hasPercentages ? -5 : 5,
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
                   metricInfo?.unit === 'percent' ? ' 📊' : ' 📈') : ''
                return [
                  formatValue(value as number, name as string), 
                  (metricInfo?.name || name) + axisIndicator
                ]
              }}
            />
          }
        />
        {metrics.map((metric, index) => {
          const opt = options?.[metric]
          const baseMetricName = opt?.originalMetricName || metric
          const metricInfo = METRICS_REGISTRY[baseMetricName]
          const unit = metricInfo?.unit
          let yAxisId = "numbers"
          
          if (unit === 'percent') {
            yAxisId = "percentages"
          } else if (unit === 'currency') {
            yAxisId = "currency"
          } else {
            yAxisId = "numbers"
          }
          
          return (
            <Line
              key={metric}
              dataKey={metric}
              type="linear"
              stroke={`var(--color-${metric})`}
              strokeWidth={2}
              dot={false}
              yAxisId={yAxisId}
            />
          )
        })}
        {metrics.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
      </LineChart>
    </ChartContainer>
  )
} 