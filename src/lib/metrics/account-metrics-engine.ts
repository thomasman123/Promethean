import { supabaseService } from '@/lib/supabase-server'
import { MetricDefinition } from './types'
import { getMetric } from './registry'

export interface AccountMetricRequest {
  metricName: string
  accountId: string
  startDate: string
  endDate: string
  options?: any
}

export interface AccountMetricResult {
  metricName: string
  value: number
  displayValue: string
  unit: string
}

export interface AccountMetricsResponse {
  metricName: string
  result: AccountMetricResult
  executedAt: string
  executionTimeMs: number
}

/**
 * Account-level metrics engine for business performance metrics
 * Handles metrics without user attribution - pure business totals
 */
export class AccountMetricsEngine {
  
  /**
   * Calculate an account-level metric
   */
  async calculate(request: AccountMetricRequest): Promise<AccountMetricsResponse> {
    const startTime = Date.now()
    
    try {
      // Get metric definition
      const metric = getMetric(request.metricName)
      if (!metric) {
        throw new Error(`Metric '${request.metricName}' not found`)
      }

      console.log(`📊 Calculating account metric: ${request.metricName}`)

      // Calculate based on metric table type
      const result = await this.calculateAccountMetric(metric, request)

      return {
        metricName: request.metricName,
        result,
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }

    } catch (error) {
      console.error('❌ Account metrics engine error:', error)
      
      return {
        metricName: request.metricName,
        result: {
          metricName: request.metricName,
          value: 0,
          displayValue: '0',
          unit: metric?.unit || 'count'
        },
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Calculate account-level metric based on table type
   */
  private async calculateAccountMetric(
    metric: MetricDefinition,
    request: AccountMetricRequest
  ): Promise<AccountMetricResult> {
    
    const { table } = metric.query
    const { accountId, startDate, endDate, options } = request

    // Handle account-only metrics (contacts, meta ads, cross-table)
    if (['contacts', 'meta_ad_performance'].includes(table) || metric.isSpecialMetric) {
      return this.calculateSpecialAccountMetric(metric, request)
    }

    // Handle interchangeable metrics (appointments, dials, discoveries, work_timeframes)
    return this.calculateInterchangeableAccountMetric(metric, request)
  }

  /**
   * Calculate account-only metrics (contacts, meta ads, special metrics)
   */
  private async calculateSpecialAccountMetric(
    metric: MetricDefinition,
    request: AccountMetricRequest
  ): Promise<AccountMetricResult> {
    
    const { accountId, startDate, endDate } = request

    if (metric.name === 'Total Leads') {
      // Count contacts with GHL creation dates
      const { data, error } = await supabaseService
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .gte('ghl_created_at', startDate)
        .lte('ghl_created_at', endDate)
        .not('ghl_created_at', 'is', null)

      if (error) throw new Error(`Database query failed: ${error.message}`)
      
      const value = data || 0
      return {
        metricName: metric.name,
        value,
        displayValue: this.formatValue(value, metric, request.options),
        unit: metric.unit || 'count'
      }
    }

    // TODO: Implement other special metrics (ROI, cost per lead, etc.)
    return {
      metricName: metric.name,
      value: 0,
      displayValue: '0',
      unit: metric.unit || 'count'
    }
  }

  /**
   * Calculate interchangeable metrics at account level (no user filtering)
   */
  private async calculateInterchangeableAccountMetric(
    metric: MetricDefinition,
    request: AccountMetricRequest
  ): Promise<AccountMetricResult> {
    
    // Use the existing metrics engine for account-level calculations
    const { MetricsEngine } = await import('./engine')
    const metricsEngine = new MetricsEngine()
    
    const metricsRequest = {
      metricName: request.metricName,
      filters: {
        accountId: request.accountId,
        dateRange: {
          start: request.startDate,
          end: request.endDate
        }
      }
    }

    console.log('📊 Using MetricsEngine for account metric:', request.metricName)
    
    const response = await metricsEngine.execute(metricsRequest)
    
    if (response.result.type === 'total' && response.result.data?.value !== undefined) {
      const value = response.result.data.value
      return {
        metricName: metric.name,
        value,
        displayValue: this.formatValue(value, metric, request.options),
        unit: metric.unit || 'count'
      }
    }
    
    // Fallback
    return {
      metricName: metric.name,
      value: 0,
      displayValue: '0',
      unit: metric.unit || 'count'
    }
  }

  /**
   * Format value based on metric unit and options
   */
  private formatValue(value: number, metric: MetricDefinition, options?: any): string {
    // Handle time format options for time-based metrics
    if (metric.unit === 'seconds' && options?.timeFormat) {
      const format = options.timeFormat
      
      if (format === 'minutes') {
        return `${(value / 60).toFixed(1)}m`
      } else if (format === 'hours') {
        return `${(value / 3600).toFixed(2)}h`
      } else if (format === 'human_readable') {
        const hours = Math.floor(value / 3600)
        const minutes = Math.floor((value % 3600) / 60)
        const seconds = Math.floor(value % 60)
        
        if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`
        } else {
          return `${seconds}s`
        }
      }
    }
    
    // Default formatting based on unit
    switch (metric.unit) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      case 'percent':
        return `${(value * 100).toFixed(1)}%`
      case 'seconds':
        if (value < 60) {
          return `${value.toFixed(0)}s`
        } else if (value < 3600) {
          return `${(value / 60).toFixed(1)}m`
        } else {
          return `${(value / 3600).toFixed(1)}h`
        }
      case 'days':
        return `${value.toFixed(1)}d`
      case 'count':
      default:
        return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
  }
}

// Export singleton instance
export const accountMetricsEngine = new AccountMetricsEngine() 