"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { format, startOfDay, eachDayOfInterval, parseISO, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, differenceInDays, endOfWeek, endOfMonth } from "date-fns"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { useDashboard } from "@/lib/dashboard-context"
import { TimeResult } from "@/lib/metrics/types"

interface BarChartWidgetProps {
  metric: string
}

type AggregationType = 'daily' | 'weekly' | 'monthly'

export function BarChartWidget({ metric }: BarChartWidgetProps) {
  const [data, setData] = useState<Array<{ date: string; value: number; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const { selectedAccountId, dateRange } = useDashboard()
  
  const metricInfo = METRICS_REGISTRY[metric]

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
    if (selectedAccountId && metric && dateRange.from && dateRange.to) {
      fetchMetricData()
    }
  }, [selectedAccountId, metric, dateRange])

  const fetchMetricData = async () => {
    setLoading(true)
    try {
      // Fetch current period data with time breakdown
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
          vizType: 'bar' // This tells the metrics engine to return time series data
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.result?.type === 'time' && result.result.data) {
          const timeData = result.result as TimeResult
          const aggregationType = getAggregationType()
          
          // Create a map for quick lookup
          const dataMap = new Map(
            timeData.data.map(item => [item.date, item.value])
          )
          
          let aggregatedData: Array<{ date: string; value: number; label: string }> = []
          
          if (aggregationType === 'daily') {
            // Daily aggregation
            const allDays = eachDayOfInterval({
              start: dateRange.from,
              end: dateRange.to
            })
            
            aggregatedData = allDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              return {
                date: dateStr,
                value: dataMap.get(dateStr) || 0,
                label: format(day, 'MMM dd')
              }
            })
          } else if (aggregationType === 'weekly') {
            // Weekly aggregation
            const weeks = eachWeekOfInterval({
              start: dateRange.from,
              end: dateRange.to
            }, { weekStartsOn: 0 }) // Sunday as start of week
            
            aggregatedData = weeks.map(weekStart => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
              let weekTotal = 0
              
              // Sum all days in this week
              const daysInWeek = eachDayOfInterval({
                start: weekStart < dateRange.from ? dateRange.from : weekStart,
                end: weekEnd > dateRange.to ? dateRange.to : weekEnd
              })
              
              daysInWeek.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                weekTotal += dataMap.get(dateStr) || 0
              })
              
              return {
                date: format(weekStart, 'yyyy-MM-dd'),
                value: weekTotal,
                label: `Week ${format(weekStart, 'w')}`
              }
            })
          } else {
            // Monthly aggregation
            const months = eachMonthOfInterval({
              start: dateRange.from,
              end: dateRange.to
            })
            
            aggregatedData = months.map(monthStart => {
              const monthEnd = endOfMonth(monthStart)
              let monthTotal = 0
              
              // Sum all days in this month
              const daysInMonth = eachDayOfInterval({
                start: monthStart < dateRange.from ? dateRange.from : monthStart,
                end: monthEnd > dateRange.to ? dateRange.to : monthEnd
              })
              
              daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                monthTotal += dataMap.get(dateStr) || 0
              })
              
              return {
                date: format(monthStart, 'yyyy-MM-dd'),
                value: monthTotal,
                label: format(monthStart, 'MMM yyyy')
              }
            })
          }
          
          setData(aggregatedData)
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

  const chartConfig = {
    value: {
      label: metricInfo?.name || metric,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          top: 20,
          right: 12,
          left: 12,
          bottom: 60, // Increased for rotated labels
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          angle={data.length > 7 ? -45 : 0}
          textAnchor={data.length > 7 ? "end" : "middle"}
          height={data.length > 7 ? 80 : 30}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (metricInfo?.unit === 'percent') {
              return `${(value * 100).toFixed(0)}%`
            } else if (metricInfo?.unit === 'currency') {
              return `$${value.toLocaleString('en-US', { notation: 'compact' })}`
            }
            return value.toLocaleString('en-US', { notation: 'compact' })
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent 
              hideLabel 
              formatter={(value) => formatValue(value as number)}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={8}>
          {data.length <= 20 && (
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={11}
              formatter={(value) => formatValue(Number(value))}
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
} 