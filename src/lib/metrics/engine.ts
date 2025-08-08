import { supabase } from '@/lib/supabase'
import { 
  MetricRequest, 
  MetricResponse, 
  MetricDefinition, 
  MetricResult,
  RepResult,
  SetterResult,
  LinkResult,
  TotalResult
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
  async execute(request: MetricRequest): Promise<MetricResponse> {
    const startTime = Date.now()
    let metric: MetricDefinition | null = null
    
    try {
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

      // Build and execute query
      const result = await this.executeMetricQuery(metric, request.filters)

      const executionTime = Date.now() - startTime

      return {
        metricName: request.metricName,
        filters: request.filters,
        result,
        executedAt: new Date().toISOString(),
        executionTimeMs: executionTime
      }

    } catch (error) {
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
  private async executeMetricQuery(metric: MetricDefinition, filters: any): Promise<MetricResult> {
    // Apply standard filters
    const appliedFilters = applyStandardFilters(filters)
    
    // Build the complete SQL query
    const sql = this.buildSQL(metric, appliedFilters)
    
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
    const results = Array.isArray(data) ? data : (data ? JSON.parse(data) : [])
    return this.formatResults(metric.breakdownType, results)
  }

  /**
   * Build complete SQL query from metric definition and filters
   */
  private buildSQL(metric: MetricDefinition, appliedFilters: any): string {
    const query = metric.query
    
    // Build SELECT clause
    let selectClause = `SELECT ${query.select.join(', ')}`
    
    // Add profile names for rep/setter/link breakdowns
    if (metric.breakdownType === 'rep' || metric.breakdownType === 'setter' || metric.breakdownType === 'link') {
      // Profile names are already included in the registry joins
    }
    
    // Build FROM clause
    let fromClause = `FROM ${query.table}`
    
    // Build JOIN clauses
    if (query.joins && query.joins.length > 0) {
      const joinClauses = query.joins.map(join => {
        const joinType = join.type || 'INNER'
        return `${joinType} JOIN ${join.table} ON ${join.on}`
      })
      fromClause += ' ' + joinClauses.join(' ')
    }
    
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
   * Format raw query results based on breakdown type
   */
  private formatResults(breakdownType: string, rawResults: any[]): MetricResult {
    switch (breakdownType) {
      case 'total':
        const totalValue = rawResults[0]?.value || 0
        return {
          type: 'total',
          data: { value: Number(totalValue) } as TotalResult
        }
      
      case 'rep':
        const repResults: RepResult[] = rawResults.map(row => ({
          repId: row.rep_id,
          repName: row.full_name || row.rep_name || 'Unknown Rep',
          value: Number(row.value || 0)
        })).filter(result => result.repId) // Filter out null rep IDs
        
        return {
          type: 'rep',
          data: repResults
        }
      
      case 'setter':
        const setterResults: SetterResult[] = rawResults.map(row => ({
          setterId: row.setter_id,
          setterName: row.full_name || row.setter_name || 'Unknown Setter',
          value: Number(row.value || 0)
        })).filter(result => result.setterId) // Filter out null setter IDs
        
        return {
          type: 'setter',
          data: setterResults
        }
      
      case 'link':
        const linkResults: LinkResult[] = rawResults.map(row => ({
          setterId: row.setter_id,
          setterName: row.setter_name || 'Unknown Setter',
          repId: row.rep_id,
          repName: row.rep_name || 'Unknown Rep',
          value: Number(row.value || 0)
        })).filter(result => result.setterId && result.repId) // Filter out incomplete links
        
        return {
          type: 'link',
          data: linkResults
        }
      
      default:
        throw new Error(`Unknown breakdown type: ${breakdownType}`)
    }
  }

  /**
   * Create error result based on breakdown type
   */
  private createErrorResult(breakdownType: string, error: Error): MetricResult {
    console.error('Creating error result for breakdown type:', breakdownType, error)
    
    switch (breakdownType) {
      case 'total':
        return { type: 'total', data: { value: 0 } }
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