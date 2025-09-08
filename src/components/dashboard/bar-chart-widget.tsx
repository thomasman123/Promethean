"use client"

import { useState, useEffect } from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { format, startOfDay, eachDayOfInterval, parseISO } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export function BarChartWidget({ metric }: BarChartWidgetProps) {
  const [data, setData] = useState<Array<{ date: string; value: number }>>([])
  const [loading, setLoading] = useState(true)
  const [previousTotal, setPreviousTotal] = useState<number | null>(null)
  const { selectedAccountId, dateRange } = useDashboard()
  
  const metricInfo = METRICS_REGISTRY[metric]

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
          breakdownType: 'time'
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.result?.type === 'time' && result.result.data) {
          const timeData = result.result as TimeResult
          
          // Create a complete date range with all days
          const allDays = eachDayOfInterval({
            start: dateRange.from,
            end: dateRange.to
          })
          
          // Create a map for quick lookup
          const dataMap = new Map(
            timeData.data.map(item => [item.date, item.value])
          )
          
          // Fill in missing dates with 0 values
          const completeData = allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            return {
              date: dateStr,
              value: dataMap.get(dateStr) || 0
            }
          })
          
          setData(completeData)
        }
      }
      
      // Fetch previous period data for trend comparison
      const daysDiff = Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = new Date(dateRange.from)
      previousStart.setDate(previousStart.getDate() - daysDiff - 1)
      const previousEnd = new Date(dateRange.from)
      previousEnd.setDate(previousEnd.getDate() - 1)
      
      const prevResponse = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricName: metric,
          filters: {
            accountId: selectedAccountId,
            dateRange: {
              start: format(previousStart, 'yyyy-MM-dd'),
              end: format(previousEnd, 'yyyy-MM-dd')
            }
          }
        })
      })
      
      if (prevResponse.ok) {
        const prevData = await prevResponse.json()
        if (prevData.result?.type === 'total' && prevData.result.data?.value !== undefined) {
          setPreviousTotal(prevData.result.data.value)
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

  const currentTotal = data.reduce((sum, item) => sum + item.value, 0)
  const trendPercentage = previousTotal !== null && previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : null

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr)
    
    // If date range is 7 days or less, show full date
    const daysDiff = Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      return format(date, 'MMM dd')
    }
    
    // For longer ranges, show abbreviated format
    return format(date, 'MMM dd')
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{metricInfo?.name || metric}</CardTitle>
          <CardDescription>{metricInfo?.description || ''}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <span className="text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{metricInfo?.name || metric}</CardTitle>
        <CardDescription>
          {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              right: 12,
              left: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={formatDateLabel}
              angle={data.length > 10 ? -45 : 0}
              textAnchor={data.length > 10 ? "end" : "middle"}
              height={data.length > 10 ? 60 : 30}
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
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(value) => formatValue(Number(value))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {trendPercentage !== null && (
          <div className="flex gap-2 leading-none font-medium">
            {trendPercentage >= 0 ? 'Trending up' : 'Trending down'} by {Math.abs(trendPercentage).toFixed(1)}% vs previous period
            <TrendingUp className={`h-4 w-4 ${trendPercentage < 0 ? 'rotate-180' : ''}`} />
          </div>
        )}
        <div className="text-muted-foreground leading-none">
          Total: {formatValue(currentTotal)}
        </div>
      </CardFooter>
    </Card>
  )
} 