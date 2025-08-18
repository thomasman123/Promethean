import { supabase } from '@/lib/supabase'
import { 
  MetricRequest, 
  MetricResponse, 
  MetricDefinition, 
  MetricResult,
  RepResult,
  SetterResult,
  LinkResult,
  TotalResult,
  TimeResult
} from './types'
import { getMetric } from './registry'
import { applyStandardFilters, buildWhereClause, flattenParams, validateFilters } from './filters'

/**
 * Main metrics engine - processes metric requests and returns results
 */
export class MetricsEngine {
  /**
   * Execute a metric request
   */
  async execute(request: MetricRequest, options?: { vizType?: string; dynamicBreakdown?: string }): Promise<MetricResponse> {
    
    let metric: MetricDefinition | null = null
    
    try {
      const startTime = Date.now()
      // Validate filters
      const filterValidation = validateFilters(request.filters)
      if (!filterValidation.valid) {
        throw new Error(`Invalid filters: ${filterValidation.errors.join(', ')}`)
      }

      // Get metric definition
      metric = getMetric(request.metricName)
      if (!metric) {
        throw new Error(`Metric '${request.metricName}' not found`)
      }

      // Build and execute query with dynamic modification
      const result = await this.executeMetricQuery(metric, request.filters, options)

      const executionTime = Date.now() - startTime

      return {
        metricName: request.metricName,
        filters: request.filters,
        result,
        executedAt: new Date().toISOString(),
        executionTimeMs: executionTime
      }

    } catch (error) {
      const startTime = Date.now()
      const executionTime = Date.now() - startTime
      
      console.error('Metrics engine error:', error)
      
      return {
        metricName: request.metricName,
        filters: request.filters,
        result: this.createErrorResult(metric?.breakdownType || 'total', error as Error),
        executedAt: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    }
  }

  /**
   * Execute the SQL query for a specific metric
   */
  private async executeMetricQuery(metric: MetricDefinition, filters: any, options?: { vizType?: string; dynamicBreakdown?: string }): Promise<MetricResult> {
    // Apply standard filters using the base table to choose correct date/account fields
    const appliedFilters = applyStandardFilters(filters, metric.query.table)
    
    // Determine if we should return a time series for chart visualizations
    const wantsTimeSeries = !!options?.vizType && options?.vizType !== 'kpi'
    
    // Build the complete SQL query
    let sql: string
    let effectiveBreakdown = metric.breakdownType

    if (wantsTimeSeries) {
      sql = this.buildTimeSeriesSQL(appliedFilters, metric)
      effectiveBreakdown = 'time'
    } else {
      sql = this.buildSQL(metric, appliedFilters)
    }
    
    // Flatten parameters for Supabase
    const params = flattenParams(appliedFilters)
    
    console.log('Executing SQL:', sql)
    console.log('Parameters:', params)
    
    // Execute query via Supabase
    const { data, error } = await supabase.rpc('execute_metrics_query_array', {
      query_sql: sql,
      query_params: params
    })
    
    if (error) {
      console.error('Supabase query error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }
    
    // Format results based on breakdown type
    // data is a JSONB array, so we need to parse it
    const results = Array.isArray(data) ? data : (data ? JSON.parse(String(data)) : [])
    return this.formatResults(effectiveBreakdown, results)
  }

  /**
   * Build complete SQL query from metric definition and filters
   */
  private buildSQL(metric: MetricDefinition, appliedFilters: any): string {
    const query = metric.query
    // Build SELECT clause
    const selectClause = `SELECT ${query.select.join(', ')}`
    
    // Build FROM clause
    const fromClause = `FROM ${query.table}`
    
    // Build WHERE clause
    const whereClause = buildWhereClause(appliedFilters, query.where)
    
    // Build GROUP BY clause
    let groupByClause = ''
    if (query.groupBy && query.groupBy.length > 0) {
      groupByClause = `GROUP BY ${query.groupBy.join(', ')}`
    }
    
    // Build HAVING clause
    let havingClause = ''
    if (query.having && query.having.length > 0) {
      havingClause = `HAVING ${query.having.join(' AND ')}`
    }
    
    // Build ORDER BY clause
    let orderByClause = ''
    if (query.orderBy && query.orderBy.length > 0) {
      orderByClause = `ORDER BY ${query.orderBy.join(', ')}`
    }
    
    // Combine all clauses
    const sqlParts = [
      selectClause,
      fromClause,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause
    ].filter(part => part.length > 0)
    
    return sqlParts.join(' ')
  }

  /**
   * Build time-series SQL with complete date range (including zero values)
   * Applies metric-specific filters in addition to standard filters
   */
  private buildTimeSeriesSQL(appliedFilters: any, metric: MetricDefinition): string {
    const baseTable = metric.query.table
    // Build WHERE conditions for the base table including metric-specific conditions
    const whereClauseWithMetric = buildWhereClause(appliedFilters, metric.query.where)

    // Determine aggregation level based on date range
    const aggregationLevel = this.determineTimeAggregation(appliedFilters)
    console.log('🐛 DEBUG - Using aggregation level:', aggregationLevel)
    
    let dateSeriesInterval: string
    let localColumn: string
    let dateDisplay: string
    
    switch (aggregationLevel) {
      case 'month':
        dateSeriesInterval = "'1 month'::interval"
        localColumn = 'local_month'
        dateDisplay = "TO_CHAR(date_series.date, 'Mon YYYY') as date"
        break
      case 'week':
        dateSeriesInterval = "'1 week'::interval"
        localColumn = 'local_week'
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-\"W\"WW') as date"
        break
      case 'day':
      default:
        dateSeriesInterval = "'1 day'::interval"
        localColumn = 'local_date'
        dateDisplay = "TO_CHAR(date_series.date, 'Mon DD') as date"
        break
    }

    // Build qualified conditions using the correct local column
    const qualifiedConditions = whereClauseWithMetric
      .replace('WHERE ', '')
      .replace(/(?<!\$)\baccount_id\b/g, `${baseTable}.account_id`)

    // Determine aggregate expression for the metric
    const rawSelect = (metric.query.select && metric.query.select[0]) ? metric.query.select[0] : 'COUNT(*) as value'
    const isCount = /count\s*\(/i.test(rawSelect)
    const valueExpr = isCount
      ? `COUNT(${baseTable}.id)`
      : rawSelect.replace(/\s+as\s+value\s*$/i, '')

    // Generate date series and LEFT JOIN with baseTable to get all dates including zeros
    const sql = `
      WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('${aggregationLevel}', $start_date::date),
          DATE_TRUNC('${aggregationLevel}', $range_end::date),
          ${dateSeriesInterval}
        )::date as date
      )
      SELECT 
        ${dateDisplay},
        COALESCE(${valueExpr}, 0) as value
      FROM date_series
      LEFT JOIN ${baseTable} ON (
        ${baseTable}.${localColumn} = date_series.date
        ${qualifiedConditions ? ` AND (${qualifiedConditions})` : ''}
      )
      GROUP BY date_series.date
      ORDER BY date_series.date ASC
    `
    
    return sql.trim()
  }

  /**
   * Determine time aggregation level based on date range
   */
  private determineTimeAggregation(appliedFilters: any): 'day' | 'week' | 'month' {
    // Access the date range from the correct location in appliedFilters
    const startDateStr = appliedFilters.params.start_date
    const endDateStr = appliedFilters.params.range_end
    
    if (!startDateStr || !endDateStr) {
      console.warn('🐛 DEBUG - Missing date parameters, defaulting to daily aggregation')
      return 'day'
    }
    
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log('🐛 DEBUG - Time aggregation calculation:', {
      startDateStr,
      endDateStr,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      diffInDays,
      willUse: diffInDays >= 60 ? 'month' : diffInDays >= 14 ? 'week' : 'day',
      logic: {
        isMonth: diffInDays >= 60,
        isWeek: diffInDays >= 14 && diffInDays < 60,
        isDay: diffInDays < 14
      },
      appliedFiltersParams: appliedFilters.params
    })
    
    // 2+ months (60+ days) → monthly aggregation
    if (diffInDays >= 60) {
      return 'month'
    }
    
    // 2+ weeks (14-59 days) → weekly aggregation  
    if (diffInDays >= 14) {
      return 'week'
    }
    
    // ≤ 2 weeks (1-13 days) → daily aggregation
    return 'day'
  }

  /**
   * Format raw query results based on breakdown type
   */
  private formatResults(breakdownType: string, rawResults: any[]): MetricResult {
    switch (breakdownType) {
      case 'total':
        return { type: 'total', data: { value: Number(rawResults?.[0]?.value || 0) } };
      case 'rep':
        return { type: 'rep', data: rawResults as any };
      case 'setter':
        return { type: 'setter', data: rawResults as any };
      case 'link':
        return { type: 'link', data: rawResults as any };
      case 'time':
        // Ensure time objects have date and value keys
        return {
          type: 'time',
          data: (rawResults || []).map((r: any) => ({
            date: String(r.date ?? r.time_period ?? ''),
            value: Number(r.value ?? 0),
          })),
        };
      default:
        return { type: 'total', data: { value: 0 } };
    }
  }

  private createErrorResult(breakdownType: string, error: Error): MetricResult {
    console.error('Metrics error:', error)
    switch (breakdownType) {
      case 'time':
        return { type: 'time', data: [] }
      case 'rep':
        return { type: 'rep', data: [] }
      case 'setter':
        return { type: 'setter', data: [] }
      case 'link':
        return { type: 'link', data: [] }
      default:
        return { type: 'total', data: { value: 0 } }
    }
  }
}

// Export singleton instance
export const metricsEngine = new MetricsEngine() 