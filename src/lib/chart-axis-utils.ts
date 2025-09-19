import { METRICS_REGISTRY } from './metrics/registry'

export interface AxisGrouping {
  percentageMetrics: string[]
  numberMetrics: string[]
  currencyMetrics: string[]
  timeMetrics: string[]
  hasPercentages: boolean
  hasNumbers: boolean
  hasCurrency: boolean
  hasTime: boolean
  hasMultipleAxisTypes: boolean
}

/**
 * Groups metrics by their unit types for multi-axis chart configuration
 */
export function groupMetricsByAxis(metrics: string[]): AxisGrouping {
  const percentageMetrics: string[] = []
  const numberMetrics: string[] = [] // count metrics
  const currencyMetrics: string[] = []
  const timeMetrics: string[] = [] // seconds, days
  
  metrics.forEach((metric) => {
    const metricInfo = METRICS_REGISTRY[metric]
    
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

  return {
    percentageMetrics,
    numberMetrics,
    currencyMetrics,
    timeMetrics,
    hasPercentages,
    hasNumbers,
    hasCurrency,
    hasTime,
    hasMultipleAxisTypes
  }
}

/**
 * Determines the appropriate yAxisId for a given metric
 */
export function getYAxisId(metric: string): string {
  const metricInfo = METRICS_REGISTRY[metric]
  const unit = metricInfo?.unit
  
  if (unit === 'percent') {
    return "percentages"
  } else if (unit === 'currency') {
    return "currency"
  } else if (unit === 'seconds' || unit === 'days') {
    return "time"
  } else {
    return "numbers" // count and other numeric types
  }
}

/**
 * Gets the appropriate axis indicator emoji for tooltips
 */
export function getAxisIndicator(metric: string, hasMultipleAxisTypes: boolean): string {
  if (!hasMultipleAxisTypes) return ''
  
  const metricInfo = METRICS_REGISTRY[metric]
  const unit = metricInfo?.unit
  
  if (unit === 'currency') return ' 💰'
  if (unit === 'percent') return ' 📊'
  if (unit === 'seconds' || unit === 'days') return ' ⏱️'
  return ' 📈' // count and other numeric types
}

/**
 * Calculates chart margins based on axis requirements
 */
export function calculateChartMargins(
  grouping: AxisGrouping, 
  metricsLength: number,
  topMargin: number = 25
): { top: number; right: number; left: number; bottom: number } {
  const { hasPercentages, hasNumbers, hasCurrency, hasTime } = grouping
  
  return {
    top: topMargin,
    right: hasPercentages ? 50 : ((hasCurrency || hasTime) && hasNumbers ? 50 : 5),
    left: (hasNumbers || hasCurrency || hasTime) && !hasPercentages ? -5 : 5,
    bottom: metricsLength > 1 ? 40 : 25,
  }
}

/**
 * Formats time values for axis ticks
 */
export function formatTimeValue(value: number, unit: 'seconds' | 'days'): string {
  if (unit === 'seconds') {
    if (value < 60) return `${value.toFixed(0)}s`
    if (value < 3600) return `${(value / 60).toFixed(0)}m`
    return `${(value / 3600).toFixed(1)}h`
  } else if (unit === 'days') {
    return `${value.toFixed(1)}d`
  }
  return value.toLocaleString('en-US', { notation: 'compact' })
} 