import { supabaseService } from '@/lib/supabase-server'
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
  async execute(request: MetricRequest, options?: { vizType?: string; dynamicBreakdown?: string; widgetSettings?: any }): Promise<MetricResponse> {
    
    let metric: MetricDefinition | null = null
    
    try {
      const startTime = Date.now()
      // Validate filters
      const filterValidation = validateFilters(request.filters)
      if (!filterValidation.valid) {
        throw new Error(`Invalid filters: ${filterValidation.errors.join(', ')}`)
      }

      // Get metric definition
      metric = getMetric(request.metricName) || null
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
  private async executeMetricQuery(metric: MetricDefinition, filters: any, options?: { vizType?: string; dynamicBreakdown?: string; widgetSettings?: any }): Promise<MetricResult> {
    // Apply standard filters using the base table to choose correct date/account fields
    const appliedFilters = applyStandardFilters(filters, metric.query.table)
    
    // Determine if we should return a time series for chart visualizations
    const wantsTimeSeries = !!options?.vizType && options?.vizType !== 'kpi'
    
    // Build the complete SQL query
    let sql: string
    let effectiveBreakdown = metric.breakdownType

    if (wantsTimeSeries) {
      sql = this.buildTimeSeriesSQL(appliedFilters, metric, options)
      effectiveBreakdown = 'time'
    } else {
      sql = this.buildSQL(metric, appliedFilters, options)
    }
    
    // Flatten parameters for Supabase
    const params = flattenParams(appliedFilters)
    
    // Add business hours parameter if configured for Speed to Lead
    if (metric.name === 'Speed to Lead' && options && options.widgetSettings?.speedToLeadBusinessHours?.length > 0) {
      params.business_hours = JSON.stringify(options.widgetSettings.speedToLeadBusinessHours);
    }
    
    console.log('Executing SQL:', sql)
    console.log('Parameters:', params)
    
    // Execute query via Supabase
    const { data, error } = await supabaseService.rpc('execute_metrics_query_array', {
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
    
    // Debug Speed to Lead if needed
    if (metric.name === 'Speed to Lead') {
      console.log('🐛 Speed to Lead results:', results?.length, 'records')
    }
    
    return this.formatResults(effectiveBreakdown, results)
  }

  /**
   * Build complete SQL query from metric definition and filters
   */
  private buildSQL(metric: MetricDefinition, appliedFilters: any, options?: any): string {
    const query = metric.query
    
    // Handle dynamic booking lead time calculation
    let selectFields = [...query.select]
    if (metric.name === 'Booking Lead Time' && options?.widgetSettings?.bookingLeadTimeCalculation) {
      const calculationType = options.widgetSettings.bookingLeadTimeCalculation
      if (calculationType === 'median') {
        selectFields = [
          "COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (date_booked_for - created_at))/86400), 1), 0) as value"
        ]
      } else {
        // Default to average
        selectFields = [
          "COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (date_booked_for - created_at))/86400), 1), 0) as value"
        ]
      }
    }
    
    // Handle dynamic speed to lead calculation
    if (metric.name === 'Speed to Lead') {
      const calculationType = options?.widgetSettings?.speedToLeadCalculation || 'average'
      // Use a CTE to properly calculate per-contact speed to lead first
      if (calculationType === 'median') {
        return this.buildSpeedToLeadSQL(appliedFilters, 'median', options)
      } else {
        return this.buildSpeedToLeadSQL(appliedFilters, 'average', options)
      }
    }

    // Handle ROI calculation (Cash collected / Ad spend)
    if (metric.name?.startsWith('ROI')) {
      return this.buildROISQL(appliedFilters, metric, options)
    }

    // Handle Cost Per Booked Call calculation (Ad spend / Total appointments)
    if (metric.name?.startsWith('Cost Per Booked Call')) {
      return this.buildCostPerBookedCallSQL(appliedFilters, metric, options)
    }
    
    // Build SELECT clause
    const selectClause = `SELECT ${selectFields.join(', ')}`
    
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
  private buildTimeSeriesSQL(appliedFilters: any, metric: MetricDefinition, options?: { vizType?: string; dynamicBreakdown?: string; widgetSettings?: any }): string {
    const baseTable = metric.query.table
    
    // Special handling for Speed to Lead metric since contacts table doesn't have local date columns
    if (metric.name === 'Speed to Lead') {
      return this.buildSpeedToLeadTimeSeriesSQL(appliedFilters, metric, options)
    }
    
    // Build WHERE conditions for the base table including metric-specific conditions
    const whereClauseWithMetric = buildWhereClause(appliedFilters, metric.query.where)

    // Determine aggregation level based on date range
    const aggregationLevel = this.determineTimeAggregation(appliedFilters)
    console.log('🐛 DEBUG - Using aggregation level:', aggregationLevel)
    
    let dateSeriesInterval: string
    let localColumn: string
    let dateDisplay: string
    let joinCondition: string
    
    switch (aggregationLevel) {
      case 'month':
        dateSeriesInterval = "'1 month'::interval"
        localColumn = 'local_month'
        joinCondition = `${baseTable}.${localColumn} = date_series.date`
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'week':
        dateSeriesInterval = "'1 week'::interval"
        localColumn = 'local_week'
        joinCondition = `${baseTable}.${localColumn} = date_series.date`
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'day':
      default:
        dateSeriesInterval = "'1 day'::interval"
        localColumn = 'local_date'
        joinCondition = `${baseTable}.${localColumn} = date_series.date`
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
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
        ${joinCondition}
        ${qualifiedConditions ? ` AND (${qualifiedConditions})` : ''}
      )
      GROUP BY date_series.date
      ORDER BY date_series.date ASC
    `
    
    return sql.trim()
  }

  /**
   * Special SQL builder for Speed to Lead metric (KPI/total)
   * Properly calculates per-contact speed to lead then aggregates
   */
  private buildSpeedToLeadSQL(appliedFilters: any, calculationType: 'average' | 'median', options?: any): string {
    let aggregationExpression: string
    if (calculationType === 'median') {
      aggregationExpression = "COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speed_to_lead_seconds)), 0)"
    } else {
      aggregationExpression = "COALESCE(ROUND(AVG(speed_to_lead_seconds)), 0)"
    }

    // Build the base CTE query with filters applied to the inner contacts query
    const contactsWhereClause = buildWhereClause(appliedFilters, [
      'contacts.date_added IS NOT NULL',
      'EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL)'
    ])

    // Check if business hours are configured
    const businessHours = options?.widgetSettings?.speedToLeadBusinessHours;
    const hasBusinessHours = businessHours && businessHours.length > 0;

    // Detailed logging for Speed to Lead
    console.log('Speed to Lead calculation:', calculationType, hasBusinessHours ? 'with business hours' : 'standard');
    console.log('Widget settings:', options?.widgetSettings);
    console.log('Business hours config:', businessHours);

    let contactDateExpression = 'contacts.date_added';
    if (hasBusinessHours) {
      // Use enhanced business hours adjustment function with weekday support
      contactDateExpression = `apply_business_hours_enhanced(contacts.date_added, contacts.phone, $business_hours)`;
    }

    const sql = `
WITH contact_speed_to_lead AS (
  SELECT 
    contacts.id,
    contacts.date_added,
    contacts.account_id,
    EXTRACT(EPOCH FROM (
      (SELECT MIN(date_called) FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL) 
      - ${contactDateExpression}
    )) as speed_to_lead_seconds
  FROM contacts
  ${contactsWhereClause}
)
SELECT ${aggregationExpression} as value
FROM contact_speed_to_lead
WHERE speed_to_lead_seconds IS NOT NULL 
  AND speed_to_lead_seconds >= 0`
    

    
    return sql.trim()
  }

  /**
   * Special time-series SQL builder for Speed to Lead metric
   * Since contacts table doesn't have local date columns, we need custom logic
   */
  private buildSpeedToLeadTimeSeriesSQL(appliedFilters: any, metric: MetricDefinition, options?: { vizType?: string; dynamicBreakdown?: string; widgetSettings?: any }): string {
    // Determine aggregation level based on date range
    const aggregationLevel = this.determineTimeAggregation(appliedFilters)
    console.log('🐛 DEBUG - Speed to Lead using aggregation level:', aggregationLevel)
    
    let dateSeriesInterval: string
    let dateGrouping: string
    let dateDisplay: string
    
    switch (aggregationLevel) {
      case 'month':
        dateSeriesInterval = "'1 month'::interval"
        dateGrouping = "DATE_TRUNC('month', contacts.date_added AT TIME ZONE 'UTC')::date"
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'week':
        dateSeriesInterval = "'1 week'::interval"
        dateGrouping = "DATE_TRUNC('week', contacts.date_added AT TIME ZONE 'UTC')::date"
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'day':
      default:
        dateSeriesInterval = "'1 day'::interval"
        dateGrouping = "DATE_TRUNC('day', contacts.date_added AT TIME ZONE 'UTC')::date"
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
    }

    // Determine calculation type (average or median)
    const calculationType = options?.widgetSettings?.speedToLeadCalculation || 'average'
    let aggregationExpression: string
    
    if (calculationType === 'median') {
      aggregationExpression = "COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY speed_to_lead_seconds)), 0)"
    } else {
      // Default to average
      aggregationExpression = "COALESCE(ROUND(AVG(speed_to_lead_seconds)), 0)"
    }

    // Build the time-series query for Speed to Lead
    const sql = `
      WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('${aggregationLevel}', $start_date::date),
          DATE_TRUNC('${aggregationLevel}', $range_end::date),
          ${dateSeriesInterval}
        )::date as date
      ),
      contact_speed_to_lead AS (
        SELECT 
          contacts.id,
          contacts.date_added,
          contacts.account_id,
          ${dateGrouping} as contact_date,
          EXTRACT(EPOCH FROM (
            (SELECT MIN(date_called) FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL) 
            - ${options?.widgetSettings?.speedToLeadBusinessHours?.length > 0 ? 
                'apply_business_hours_enhanced(contacts.date_added, contacts.phone, $business_hours)' : 
                'contacts.date_added'}
          )) as speed_to_lead_seconds
        FROM contacts
        WHERE contacts.date_added IS NOT NULL
          AND contacts.date_added >= $start_date::timestamptz
          AND contacts.date_added < $end_plus::timestamptz
          AND contacts.account_id = $account_id
          AND EXISTS (SELECT 1 FROM dials WHERE dials.contact_id = contacts.id AND dials.contact_id IS NOT NULL)
      ),
      speed_to_lead_by_date AS (
        SELECT 
          contact_date,
          ${aggregationExpression} as value
        FROM contact_speed_to_lead
        WHERE speed_to_lead_seconds IS NOT NULL 
          AND speed_to_lead_seconds >= 0
        GROUP BY contact_date
      )
      SELECT 
        ${dateDisplay},
        COALESCE(speed_to_lead_by_date.value, 0) as value
      FROM date_series
      LEFT JOIN speed_to_lead_by_date ON date_series.date = speed_to_lead_by_date.contact_date
      ORDER BY date_series.date ASC
    `
    
    return sql.trim()
  }

     /**
    * Special SQL builder for ROI calculation (Cash collected / Ad spend)
    */
   private buildROISQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
     // ROI = (Cash Collected / Ad Spend) * 100 for percentage
     // We need to join appointments and meta_ad_performance tables
     
     const whereClause = buildWhereClause(appliedFilters, [])
     
     return `
       WITH cash_data AS (
         SELECT 
           account_id,
           COALESCE(SUM(cash_collected), 0) as total_cash
         FROM appointments
         ${whereClause}
         GROUP BY account_id
       ),
       spend_data AS (
         SELECT 
           account_id,
           COALESCE(SUM(spend), 0) as total_spend
         FROM meta_ad_performance
         ${whereClause.replace('appointments.', 'meta_ad_performance.')}
         GROUP BY account_id
       )
       SELECT 
         CASE 
           WHEN spend_data.total_spend > 0 
           THEN ROUND((cash_data.total_cash / spend_data.total_spend) * 100, 2)
           ELSE 0 
         END as value
       FROM cash_data
       FULL OUTER JOIN spend_data ON cash_data.account_id = spend_data.account_id
     `.trim()
   }

     /**
    * Special SQL builder for Cost Per Booked Call calculation (Ad spend / Total appointments)
    */
   private buildCostPerBookedCallSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
     // Cost Per Booked Call = Total Ad Spend / Total Appointments
     // We need to join appointments and meta_ad_performance tables
     
     const whereClause = buildWhereClause(appliedFilters, [])
     
     return `
       WITH appointment_data AS (
         SELECT 
           account_id,
           COUNT(*) as total_appointments
         FROM appointments
         ${whereClause}
         GROUP BY account_id
       ),
       spend_data AS (
         SELECT 
           account_id,
           COALESCE(SUM(spend), 0) as total_spend
         FROM meta_ad_performance
         ${whereClause.replace('appointments.', 'meta_ad_performance.')}
         GROUP BY account_id
       )
       SELECT 
         CASE 
           WHEN appointment_data.total_appointments > 0 
           THEN ROUND(spend_data.total_spend / appointment_data.total_appointments, 2)
           ELSE 0 
         END as value
       FROM appointment_data
       FULL OUTER JOIN spend_data ON appointment_data.account_id = spend_data.account_id
     `.trim()
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
      willUse: diffInDays > 90 ? 'month' : diffInDays > 14 ? 'week' : 'day',
      logic: {
        isMonth: diffInDays > 90,
        isWeek: diffInDays > 14 && diffInDays <= 90,
        isDay: diffInDays <= 14
      },
      appliedFiltersParams: appliedFilters.params
    })
    
    // > 90 days → monthly aggregation
    if (diffInDays > 90) {
      return 'month'
    }
    
    // 15-90 days → weekly aggregation  
    if (diffInDays > 14) {
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