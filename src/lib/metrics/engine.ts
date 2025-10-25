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
    // Handle special metrics that require custom calculation logic
    if (metric.isSpecialMetric) {
      return this.handleSpecialMetric(metric, filters, options)
    }
    
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
   * Handle special metrics that require custom calculation logic
   */
  private async handleSpecialMetric(metric: MetricDefinition, filters: any, options?: any): Promise<MetricResult> {
    const { accountId, dateRange } = filters
    
    // Handle per hour metrics (bookings_per_hour, dials_per_hour, hours_worked)
    if (['Bookings per Hour', 'Dials per Hour', 'Hours Worked'].includes(metric.name)) {
      return this.calculateAggregatedWorkTimeframeMetric(metric, accountId, dateRange.start, dateRange.end, options)
    }
    
    // Handle other special metrics by delegating to existing build methods
    const appliedFilters = applyStandardFilters(filters, metric.query.table)
    let sql: string
    
    if (metric.name === 'Speed to Lead') {
      const calculationType = options?.widgetSettings?.speedToLeadCalculation || 'average'
      sql = this.buildSpeedToLeadSQL(appliedFilters, calculationType, options)
    } else if (metric.name?.startsWith('ROI')) {
      sql = this.buildROISQL(appliedFilters, metric, options)
    } else if (metric.name?.startsWith('Rep ROI')) {
      sql = this.buildRepROISQL(appliedFilters, metric, options)
    } else if (metric.name?.startsWith('Cost Per Booked Call')) {
      sql = this.buildCostPerBookedCallSQL(appliedFilters, metric, options)
    } else if (metric.name === 'Lead to Appointment') {
      sql = this.buildLeadToAppointmentSQL(filters, metric, options)
    } else if (metric.name === 'Data Completion Rate') {
      sql = this.buildDataCompletionRateSQL(appliedFilters, metric, options)
    } else if (metric.name === 'Overdue Items') {
      sql = this.buildOverdueItemsSQL(appliedFilters, metric, options)
    } else if (metric.name === 'Overdue Percentage') {
      sql = this.buildOverduePercentageSQL(appliedFilters, metric, options)
    } else if (metric.name === 'Cash Per Dial') {
      // Handle Cash Per Dial - needs cross-table calculation between dials and appointments
      sql = this.buildCashPerDialSQL(appliedFilters, metric, options)
    } else {
      // Default fallback for unhandled special metrics
      console.warn(`Special metric '${metric.name}' not implemented in handleSpecialMetric`)
      return { type: 'total', data: { value: 0 } }
    }
    
    const params = flattenParams(appliedFilters)
    
    // Add business hours parameter if configured for Speed to Lead
    if (metric.name === 'Speed to Lead' && options && options.widgetSettings?.speedToLeadBusinessHours?.length > 0) {
      params.business_hours = JSON.stringify(options.widgetSettings.speedToLeadBusinessHours);
    }
    
    console.log(`Executing ${metric.name} SQL:`, sql)
    console.log('Parameters:', params)
    
    const { data, error } = await supabaseService.rpc('execute_metrics_query_array', {
      query_sql: sql,
      query_params: params
    })
    
    if (error) {
      console.error('Supabase query error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }
    
    const results = Array.isArray(data) ? data : (data ? JSON.parse(String(data)) : [])
    return this.formatResults(metric.breakdownType, results)
  }

  /**
   * Calculate aggregated work timeframe metrics across all account users
   */
  private async calculateAggregatedWorkTimeframeMetric(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    options?: any
  ): Promise<MetricResult> {
    try {
      // Get account timezone
      const { data: account, error: accountError } = await supabaseService
        .from('accounts')
        .select('business_timezone')
        .eq('id', accountId)
        .single()

      if (accountError || !account) {
        console.error('Error fetching account timezone:', accountError)
        return { type: 'total', data: { value: 0 } }
      }

      const timezone = account.business_timezone || 'UTC'

      // Get all setter users for this account
      const { data: accountUsers, error: usersError } = await supabaseService
        .from('account_access')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('role', 'setter')

      if (usersError) {
        console.error('Error fetching account users:', usersError)
        return { type: 'total', data: { value: 0 } }
      }

      const userIds = accountUsers?.map(u => u.user_id) || []
      
      if (userIds.length === 0) {
        return { type: 'total', data: { value: 0 } }
      }

      // Query dials data for all users to calculate work hours on-demand
      const { data: dials, error } = await supabaseService
        .from('dials')
        .select('setter_user_id, date_called, booked')
        .eq('account_id', accountId)
        .gte('date_called', startDate)
        .lte('date_called', endDate)
        .in('setter_user_id', userIds)
        .not('setter_user_id', 'is', null)

      if (error) {
        console.error('Error fetching dials for work timeframes:', error)
        return { type: 'total', data: { value: 0 } }
      }

      // Calculate aggregated work metrics
      let totalHours = 0
      let totalBookings = 0
      let totalDials = 0
      
      // Group dials by user and date (in their timezone)
      const userDateDials = new Map<string, Map<string, any[]>>()
      
      dials?.forEach(dial => {
        if (!dial.setter_user_id) return
        
        // Convert to user's local date
        const localDate = new Date(dial.date_called).toLocaleDateString('en-CA', { 
          timeZone: timezone 
        })
        
        if (!userDateDials.has(dial.setter_user_id)) {
          userDateDials.set(dial.setter_user_id, new Map())
        }
        
        const userDates = userDateDials.get(dial.setter_user_id)!
        if (!userDates.has(localDate)) {
          userDates.set(localDate, [])
        }
        
        userDates.get(localDate)!.push(dial)
      })

      // Calculate work hours for each user and aggregate
      userIds.forEach(userId => {
        const userDates = userDateDials.get(userId)
        if (!userDates) return

        // Calculate for each day
        userDates.forEach(dayDials => {
          if (dayDials.length === 0) return

          // Sort by time to get first and last
          const sortedDials = dayDials.sort((a, b) => 
            new Date(a.date_called).getTime() - new Date(b.date_called).getTime()
          )

          const firstDial = new Date(sortedDials[0].date_called)
          const lastDial = new Date(sortedDials[sortedDials.length - 1].date_called)
          
          // Calculate work hours for this day (minimum 0.1 to avoid division by zero)
          const dayHours = Math.max(
            (lastDial.getTime() - firstDial.getTime()) / (1000 * 60 * 60),
            0.1
          )
          
          totalHours += dayHours
          totalDials += dayDials.length
          totalBookings += dayDials.filter(d => d.booked === true).length
        })
      })

      // Calculate final value based on metric type
      let value = 0
      if (metric.name === 'Bookings per Hour') {
        value = totalHours > 0 ? totalBookings / totalHours : 0
      } else if (metric.name === 'Dials per Hour') {
        value = totalHours > 0 ? totalDials / totalHours : 0
      } else if (metric.name === 'Hours Worked') {
        value = totalHours
      }
      
      const roundedValue = Math.round(value * 100) / 100 // Round to 2 decimal places
      
      console.log(`Calculated ${metric.name}: ${roundedValue} (${totalBookings} bookings, ${totalDials} dials, ${totalHours.toFixed(2)} hours)`)
      
      return { type: 'total', data: { value: roundedValue } }
      
    } catch (error) {
      console.error(`Error calculating ${metric.name}:`, error)
      return { type: 'total', data: { value: 0 } }
    }
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

    // Handle Lead to Appointment calculation (Appointments / Contacts)
    if (metric.name === 'Lead to Appointment') {
      return this.buildLeadToAppointmentSQL(appliedFilters, metric, options)
    }

    // Handle Data Completion Rate calculation
    if (metric.name === 'Data Completion Rate') {
      return this.buildDataCompletionRateSQL(appliedFilters, metric, options)
    }

    // Handle Overdue Items calculation
    if (metric.name === 'Overdue Items') {
      return this.buildOverdueItemsSQL(appliedFilters, metric, options)
    }

    // Handle Overdue Percentage calculation
    if (metric.name === 'Overdue Percentage') {
      return this.buildOverduePercentageSQL(appliedFilters, metric, options)
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
    
    // Special handling for Cost Per Booked Call time series (cross-table calculation)
    if (metric.name?.startsWith('Cost Per Booked Call')) {
      return this.buildCostPerBookedCallTimeSeriesSQL(appliedFilters, metric, options)
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
   * Special time-series SQL builder for Cost Per Booked Call metric
   * Calculates ad spend / appointments for each time period
   */
  private buildCostPerBookedCallTimeSeriesSQL(appliedFilters: any, metric: MetricDefinition, options?: { vizType?: string; dynamicBreakdown?: string; widgetSettings?: any }): string {
    // Determine aggregation level based on date range
    const aggregationLevel = this.determineTimeAggregation(appliedFilters)
    console.log('🐛 DEBUG - Cost Per Booked Call using aggregation level:', aggregationLevel)
    
    let dateSeriesInterval: string
    let localColumn: string
    let dateDisplay: string
    
    switch (aggregationLevel) {
      case 'month':
        dateSeriesInterval = "'1 month'::interval"
        localColumn = 'local_month'
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'week':
        dateSeriesInterval = "'1 week'::interval"
        localColumn = 'local_week'
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
      case 'day':
      default:
        dateSeriesInterval = "'1 day'::interval"
        localColumn = 'local_date'
        dateDisplay = "TO_CHAR(date_series.date, 'YYYY-MM-DD') as date"
        break
    }

    const whereClause = buildWhereClause(appliedFilters, [])
    // Build a meta_ad_performance-safe WHERE clause (date + account only)
    const metaWhereClause = this.buildMetaWhereClause(appliedFilters)

    const sql = `
      WITH date_series AS (
        SELECT generate_series(
          $start_date::date,
          $range_end::date,
          ${dateSeriesInterval}
        ) as date
      ),
      appointment_data_by_date AS (
        SELECT 
          ${localColumn} as appointment_date,
          COUNT(*) as daily_appointments
        FROM appointments
        ${whereClause}
        GROUP BY ${localColumn}
      ),
      spend_data_by_date AS (
        SELECT 
          ${localColumn} as spend_date,
          COALESCE(SUM(spend), 0) as daily_spend
        FROM meta_ad_performance
        ${metaWhereClause}
        AND spend > 0
        GROUP BY ${localColumn}
      ),
      cost_per_call_by_date AS (
        SELECT 
          COALESCE(appointment_data_by_date.appointment_date, spend_data_by_date.spend_date) as period_date,
          CASE 
            WHEN appointment_data_by_date.daily_appointments > 0 AND spend_data_by_date.daily_spend > 0
            THEN ROUND(spend_data_by_date.daily_spend / appointment_data_by_date.daily_appointments, 2)
            ELSE NULL
          END as value
        FROM appointment_data_by_date
        INNER JOIN spend_data_by_date ON appointment_data_by_date.appointment_date = spend_data_by_date.spend_date
      )
      SELECT 
        ${dateDisplay},
        COALESCE(cost_per_call_by_date.value, NULL) as value
      FROM date_series
      LEFT JOIN cost_per_call_by_date ON date_series.date = cost_per_call_by_date.period_date
      ORDER BY date_series.date ASC
    `
    
    return sql.trim()
  }

     /**
    * Special SQL builder for ROI calculation (Cash collected / Ad spend)
    */
   private buildROISQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
     // ROI = (Cash Collected / Ad Spend) for percentage unit we will return a fraction (0..1)
     // We need to join appointments and meta_ad_performance tables
     
     const whereClause = buildWhereClause(appliedFilters, [])

     // Build a meta_ad_performance-safe WHERE clause (date + account only)
     const metaWhereClause = this.buildMetaWhereClause(appliedFilters)
     
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
         ${metaWhereClause}
         GROUP BY account_id
       )
       SELECT 
         CASE 
           WHEN spend_data.total_spend > 0 
           THEN ROUND((cash_data.total_cash / spend_data.total_spend), 4)
           ELSE 0 
         END as value
       FROM cash_data
       FULL OUTER JOIN spend_data ON cash_data.account_id = spend_data.account_id
     `.trim()
   }

   /**
    * Special SQL builder for Rep ROI calculation
    * Formula: Cash collected / (Cost per appointment × Rep's appointments)
    * Cost per appointment = Total ad spend / Total appointments
    */
   private buildRepROISQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
     const whereClause = buildWhereClause(appliedFilters, [])
     // Build an appointments WHERE clause without user-specific filters for account-wide totals
     const apptWhereNoUsers = this.buildAppointmentsWhereClauseWithoutUserFilters(appliedFilters)
     // Build a meta_ad_performance-safe WHERE clause (date + account only)
     const metaWhereClause = this.buildMetaWhereClause(appliedFilters)
     const breakdownType = metric.breakdownType
     const isMultiplier = metric.name?.includes('Multiplier')
 
    // Use date_booked for appointments date filtering to keep ROI coherent with booked cost/appointments
    const apptWhereWithUsersDateBooked = this.buildAppointmentsWhereClauseUsingDateBooked(appliedFilters)

    // Handle different breakdown types
    switch (breakdownType) {
      case 'total':
        // Total ROI across all reps
        return `
          WITH total_appointments AS (
            SELECT 
              account_id,
              COUNT(*) as total_count
            FROM appointments
            ${apptWhereNoUsers}
            GROUP BY account_id
          ),
          cash_data AS (
            SELECT 
              account_id,
              COALESCE(SUM(cash_collected), 0) as total_cash
            FROM appointments
            ${apptWhereWithUsersDateBooked}
            AND sales_rep_user_id IS NOT NULL
            GROUP BY account_id
          ),
          spend_data AS (
            SELECT 
              account_id,
              COALESCE(SUM(spend), 0) as total_spend
            FROM meta_ad_performance
            ${metaWhereClause}
            AND spend > 0
            GROUP BY account_id
          )
          SELECT 
            CASE 
              WHEN total_appointments.total_count > 0 AND spend_data.total_spend > 0
              THEN ROUND(
                ${isMultiplier 
                  ? 'cash_data.total_cash / spend_data.total_spend'
                  : '(cash_data.total_cash / spend_data.total_spend - 1)'
                }, 4)
              ELSE 0 
            END as value
          FROM cash_data
          LEFT JOIN total_appointments ON cash_data.account_id = total_appointments.account_id
          LEFT JOIN spend_data ON cash_data.account_id = spend_data.account_id
        `.trim()
         
      case 'rep':
        // ROI per sales rep
        return `
          WITH total_appointments AS (
            SELECT 
              account_id,
              COUNT(*) as total_count
            FROM appointments
            ${apptWhereNoUsers}
            GROUP BY account_id
          ),
          rep_data AS (
            SELECT 
              account_id,
              sales_rep_user_id,
              COUNT(*) as rep_appointments,
              COALESCE(SUM(cash_collected), 0) as rep_cash
            FROM appointments
            ${apptWhereWithUsersDateBooked}
            AND sales_rep_user_id IS NOT NULL
            GROUP BY account_id, sales_rep_user_id
          ),
          spend_data AS (
            SELECT 
              account_id,
              COALESCE(SUM(spend), 0) as total_spend
            FROM meta_ad_performance
            ${metaWhereClause}
            AND spend > 0
            GROUP BY account_id
          ),
          rep_names AS (
            SELECT 
              p.id as user_id,
              COALESCE(p.full_name, p.email, 'Unknown Rep') as user_name
            FROM profiles p
          )
          SELECT 
            rep_data.sales_rep_user_id as repId,
            rep_names.user_name as repName,
            CASE 
              WHEN total_appointments.total_count > 0 AND spend_data.total_spend > 0 AND rep_data.rep_appointments > 0
              THEN 
                CASE 
                  WHEN ${isMultiplier ? 'true' : 'false'}
                  THEN ROUND(
                    rep_data.rep_cash / ((spend_data.total_spend / total_appointments.total_count) * rep_data.rep_appointments), 4
                  )
                  ELSE ROUND(
                    ((rep_data.rep_cash / ((spend_data.total_spend / total_appointments.total_count) * rep_data.rep_appointments)) - 1), 4
                  )
                END
              ELSE 0 
            END as value
          FROM rep_data
          LEFT JOIN total_appointments ON rep_data.account_id = total_appointments.account_id
          LEFT JOIN spend_data ON rep_data.account_id = spend_data.account_id
          LEFT JOIN rep_names ON rep_data.sales_rep_user_id = rep_names.user_id
          ORDER BY rep_names.user_name
        `.trim()
         
      default:
        throw new Error(`Unsupported breakdown type for Rep ROI: ${breakdownType}`)
    }
   }

          /**
    * Special SQL builder for Cost Per Booked Call calculation (Ad spend / Total appointments)
    */
   private buildCostPerBookedCallSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
     // Cost Per Booked Call = Total Ad Spend / Total Appointments
     // We need to join appointments and meta_ad_performance tables
     
     const whereClause = buildWhereClause(appliedFilters, [])
    // Build an appointments WHERE clause without user-specific filters for account-wide totals
    const apptWhereNoUsers = this.buildAppointmentsWhereClauseWithoutUserFilters(appliedFilters)
     // Build a meta_ad_performance-safe WHERE clause (date + account only)
     const metaWhereClause = this.buildMetaWhereClause(appliedFilters)
     const breakdownType = metric.breakdownType
    
    // Handle different breakdown types
    switch (breakdownType) {
      case 'total':
        return `
          WITH appointment_data AS (
            SELECT 
              account_id,
              COUNT(*) as total_appointments
            FROM appointments
            ${apptWhereNoUsers}
            GROUP BY account_id
          ),
          spend_data AS (
            SELECT 
              account_id,
              COALESCE(SUM(spend), 0) as total_spend
            FROM meta_ad_performance
            ${metaWhereClause}
            AND spend > 0
            GROUP BY account_id
          )
          SELECT 
            CASE 
              WHEN appointment_data.total_appointments > 0 AND spend_data.total_spend > 0
              THEN ROUND(spend_data.total_spend / appointment_data.total_appointments, 2)
              ELSE NULL 
            END as value
          FROM appointment_data
          INNER JOIN spend_data ON appointment_data.account_id = spend_data.account_id
        `.trim()
        
             case 'rep':
         // Cost per booked call by sales rep (proportional attribution)
         return `
           WITH total_appointments AS (
             SELECT 
               account_id,
               COUNT(*) as total_count
             FROM appointments
             ${apptWhereNoUsers}
             GROUP BY account_id
           ),
           appointment_data AS (
             SELECT 
               account_id,
               sales_rep_user_id,
               COUNT(*) as rep_appointments
             FROM appointments
             ${whereClause}
             AND sales_rep_user_id IS NOT NULL
             GROUP BY account_id, sales_rep_user_id
           ),
           spend_data AS (
             SELECT 
               account_id,
               COALESCE(SUM(spend), 0) as total_spend
             FROM meta_ad_performance
             ${metaWhereClause}
             AND spend > 0
             GROUP BY account_id
           ),
           rep_names AS (
             SELECT 
               p.id as user_id,
               COALESCE(p.full_name, p.email, 'Unknown Rep') as user_name
             FROM profiles p
           )
           SELECT 
             rep_data.sales_rep_user_id as repId,
             rep_names.user_name as repName,
             CASE 
               WHEN total_appointments.total_count > 0 AND spend_data.total_spend > 0 AND rep_data.rep_appointments > 0
               THEN ROUND(
                 (spend_data.total_spend / total_appointments.total_count) * rep_data.rep_appointments, 2
               )
               ELSE NULL 
             END as value
           FROM appointment_data rep_data
           LEFT JOIN total_appointments ON rep_data.account_id = total_appointments.account_id
           LEFT JOIN spend_data ON rep_data.account_id = spend_data.account_id
           LEFT JOIN rep_names ON rep_data.sales_rep_user_id = rep_names.user_id
           ORDER BY rep_names.user_name
         `.trim()
        
             case 'setter':
         // Cost per booked call by setter (proportional attribution)
         return `
           WITH total_appointments AS (
             SELECT 
               account_id,
               COUNT(*) as total_count
             FROM appointments
             ${whereClause}
             GROUP BY account_id
           ),
           appointment_data AS (
             SELECT 
               account_id,
               setter_user_id,
               COUNT(*) as setter_appointments
             FROM appointments
             ${whereClause}
             AND setter_user_id IS NOT NULL
             GROUP BY account_id, setter_user_id
           ),
           spend_data AS (
             SELECT 
               account_id,
               COALESCE(SUM(spend), 0) as total_spend
             FROM meta_ad_performance
             ${metaWhereClause}
             AND spend > 0
             GROUP BY account_id
           ),
           setter_names AS (
             SELECT 
               p.id as user_id,
               COALESCE(p.full_name, p.email, 'Unknown Setter') as user_name
             FROM profiles p
           )
           SELECT 
             appointment_data.setter_user_id as setterId,
             setter_names.user_name as setterName,
             CASE 
               WHEN total_appointments.total_count > 0 AND spend_data.total_spend > 0
               THEN ROUND(spend_data.total_spend / total_appointments.total_count, 2)
               ELSE NULL 
             END as value
           FROM appointment_data
           INNER JOIN total_appointments ON appointment_data.account_id = total_appointments.account_id
           INNER JOIN spend_data ON appointment_data.account_id = spend_data.account_id
           LEFT JOIN setter_names ON appointment_data.setter_user_id = setter_names.user_id
           ORDER BY setter_names.user_name
         `.trim()
        
             case 'link':
         // Cost per booked call showing setter→rep relationships (proportional attribution)
         return `
           WITH total_appointments AS (
             SELECT 
               account_id,
               COUNT(*) as total_count
             FROM appointments
             ${whereClause}
             GROUP BY account_id
           ),
           appointment_data AS (
             SELECT 
               account_id,
               setter_user_id,
               sales_rep_user_id,
               COUNT(*) as link_appointments
             FROM appointments
             ${whereClause}
             AND setter_user_id IS NOT NULL 
             AND sales_rep_user_id IS NOT NULL
             GROUP BY account_id, setter_user_id, sales_rep_user_id
           ),
           spend_data AS (
             SELECT 
               account_id,
               COALESCE(SUM(spend), 0) as total_spend
             FROM meta_ad_performance
             ${metaWhereClause}
             AND spend > 0
             GROUP BY account_id
           ),
           user_names AS (
             SELECT 
               p.id as user_id,
               COALESCE(p.full_name, p.email, 'Unknown User') as user_name
             FROM profiles p
           )
           SELECT 
             appointment_data.setter_user_id as setterId,
             setter_names.user_name as setterName,
             appointment_data.sales_rep_user_id as repId,
             rep_names.user_name as repName,
             CASE 
               WHEN total_appointments.total_count > 0 AND spend_data.total_spend > 0
               THEN ROUND(spend_data.total_spend / total_appointments.total_count, 2)
               ELSE NULL 
             END as value
           FROM appointment_data
           INNER JOIN total_appointments ON appointment_data.account_id = total_appointments.account_id
           INNER JOIN spend_data ON appointment_data.account_id = spend_data.account_id
           LEFT JOIN user_names setter_names ON appointment_data.setter_user_id = setter_names.user_id
           LEFT JOIN user_names rep_names ON appointment_data.sales_rep_user_id = rep_names.user_id
           ORDER BY setter_names.user_name, rep_names.user_name
         `.trim()
        
      default:
        throw new Error(`Unsupported breakdown type for Cost Per Booked Call: ${breakdownType}`)
    }
  }

   /**
    * Special SQL builder for Lead to Appointment calculation
    * Calculates what percentage of contacts created in the date range have ANY appointment
    */
   private buildLeadToAppointmentSQL(filtersOrApplied: any, metric: MetricDefinition, options?: any): string {
     // New approach: Of the contacts created in the selected date range,
     // what percentage have at least one appointment (regardless of appointment date)?
     // This gives a true conversion rate for that cohort of leads.
     
     // Check if we received raw filters or appliedFilters
     const isRawFilters = filtersOrApplied.dateRange !== undefined
     
     if (isRawFilters) {
       // Generate appliedFilters for contacts (to filter by creation date)
       const contactFilters = applyStandardFilters(filtersOrApplied, 'contacts')
       const contactWhereClause = buildWhereClause(contactFilters, [])
       
       return `
         WITH contacts_in_range AS (
           SELECT 
             id,
             account_id
           FROM contacts
           ${contactWhereClause}
         ),
         contacts_with_appointments AS (
           SELECT DISTINCT c.id, c.account_id
           FROM contacts_in_range c
           INNER JOIN appointments a ON a.contact_id = c.id
         )
         SELECT 
           CASE 
             WHEN COUNT(DISTINCT c.id) > 0 
             THEN ROUND((COUNT(DISTINCT cwa.id)::DECIMAL / COUNT(DISTINCT c.id)), 4)
             ELSE 0 
           END as value
         FROM contacts_in_range c
         LEFT JOIN contacts_with_appointments cwa ON cwa.id = c.id
       `.trim()
     } else {
       // Legacy: received appliedFilters (based on contacts table)
       const contactWhereClause = buildWhereClause(filtersOrApplied, [])
       
       return `
         WITH contacts_in_range AS (
           SELECT 
             id,
             account_id
           FROM contacts
           ${contactWhereClause}
         ),
         contacts_with_appointments AS (
           SELECT DISTINCT c.id, c.account_id
           FROM contacts_in_range c
           INNER JOIN appointments a ON a.contact_id = c.id
         )
         SELECT 
           CASE 
             WHEN COUNT(DISTINCT c.id) > 0 
             THEN ROUND((COUNT(DISTINCT cwa.id)::DECIMAL / COUNT(DISTINCT c.id)), 4)
             ELSE 0 
           END as value
         FROM contacts_in_range c
         LEFT JOIN contacts_with_appointments cwa ON cwa.id = c.id
       `.trim()
     }
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
    
    // For single month periods (like Sep 1-30), use monthly aggregation
    if (diffInDays >= 28 && diffInDays <= 31) {
      return 'month'
    }
    
    // > 60 days → monthly aggregation
    if (diffInDays >= 60) {
      return 'month'
    }
    
    // 14+ days → weekly aggregation  
    if (diffInDays >= 14) {
      return 'week'
    }
    
    // < 14 days → daily aggregation
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

  /**
   * Build SQL for Data Completion Rate metric
   * Calculates percentage of appointments and discoveries with data_filled = true
   */
  private buildDataCompletionRateSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
    const whereClauseWithMetric = buildWhereClause(appliedFilters, [])

    const sql = `
    WITH completion_data AS (
      -- Appointments where sales_rep_user_id is assigned
      SELECT 
        data_filled,
        sales_rep_user_id as user_id,
        'appointment' as item_type
      FROM appointments 
      ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'appointments.account_id')}
        AND sales_rep_user_id IS NOT NULL
      
      UNION ALL
      
      -- Discoveries where setter_user_id is assigned  
      SELECT 
        data_filled,
        setter_user_id as user_id,
        'discovery' as item_type
      FROM discoveries 
      ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'discoveries.account_id')}
        AND setter_user_id IS NOT NULL
    )
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE data_filled = true)::DECIMAL / COUNT(*) * 100, 2)
        ELSE 0 
      END as value
    FROM completion_data
    `
    
    return sql.trim()
  }

  /**
   * Build SQL for Overdue Items metric
   * Counts appointments and discoveries that are 24+ hours overdue without data entry
   */
  private buildOverdueItemsSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
    const whereClauseWithMetric = buildWhereClause(appliedFilters, [])
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const sql = `
    WITH overdue_data AS (
      -- Overdue appointments where sales_rep_user_id is assigned
      SELECT 
        id,
        sales_rep_user_id as user_id,
        'appointment' as item_type
      FROM appointments 
      ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'appointments.account_id')}
        AND sales_rep_user_id IS NOT NULL
        AND date_booked_for < '${overdueThreshold}'
        AND data_filled = false
      
      UNION ALL
      
      -- Overdue discoveries where setter_user_id is assigned
      SELECT 
        id,
        setter_user_id as user_id,
        'discovery' as item_type
      FROM discoveries 
      ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'discoveries.account_id')}
        AND setter_user_id IS NOT NULL
        AND date_booked_for < '${overdueThreshold}'
        AND data_filled = false
    )
    SELECT COUNT(*) as value
    FROM overdue_data
    `
    
    return sql.trim()
  }

  /**
   * Build SQL for Overdue Percentage metric
   * Calculates percentage of appointments and discoveries that are overdue
   */
  private buildOverduePercentageSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
    const whereClauseWithMetric = buildWhereClause(appliedFilters, [])
    const totalItemsSql = `
      WITH total_items AS (
        -- Total appointments with data not filled (regardless of date)
        SELECT 
          COUNT(*) as total_count
        FROM appointments 
        ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'appointments.account_id')}
          AND data_filled = false
        
        UNION ALL
        
        -- Total discoveries with data not filled (regardless of date)
        SELECT 
          COUNT(*) as total_count
        FROM discoveries 
        ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'discoveries.account_id')}
          AND data_filled = false
      )
      SELECT COALESCE(SUM(total_count), 0) as total_count
      FROM total_items
    `

    const overdueItemsSql = `
      WITH overdue_items AS (
        -- Overdue appointments (24+ hours past date_booked_for with no data)
        SELECT 
          COUNT(*) as overdue_count
        FROM appointments 
        ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'appointments.account_id')}
          AND date_booked_for < '${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}'
          AND data_filled = false
        
        UNION ALL
        
        -- Overdue discoveries (24+ hours past date_booked_for with no data)
        SELECT 
          COUNT(*) as overdue_count
        FROM discoveries 
        ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'discoveries.account_id')}
          AND date_booked_for < '${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}'
          AND data_filled = false
      )
      SELECT COALESCE(SUM(overdue_count), 0) as overdue_count
      FROM overdue_items
    `

    return `
      WITH total_count AS (${totalItemsSql}),
           overdue_count AS (${overdueItemsSql})
      SELECT 
        CASE 
          WHEN total_count.total_count > 0 
          THEN ROUND((overdue_count.overdue_count::DECIMAL / total_count.total_count), 4)
          ELSE 0 
        END as value
      FROM total_count
      CROSS JOIN overdue_count
    `.trim()
  }

  /**
   * Special SQL builder for Cash Per Dial metric
   * Calculates the average cash collected per dial by joining with appointments.
   */
  private buildCashPerDialSQL(appliedFilters: any, metric: MetricDefinition, options?: any): string {
    const whereClauseWithMetric = buildWhereClause(appliedFilters, [])

    const sql = `
      WITH all_dials AS (
        SELECT 
          dials.id,
          dials.account_id,
          dials.setter_user_id,
          dials.created_at,
          dials.booked,
          dials.booked_appointment_id
        FROM dials
        ${whereClauseWithMetric.replace(/(?<!\$)\baccount_id\b/g, 'dials.account_id')}
      ),
      dials_with_cash AS (
        SELECT 
          d.id,
          d.account_id,
          COALESCE(a.cash_collected, 0) as cash_collected
        FROM all_dials d
        LEFT JOIN appointments a ON d.booked_appointment_id = a.id
      )
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN COALESCE(ROUND(SUM(cash_collected)::DECIMAL / COUNT(*), 2), 0)
          ELSE 0 
        END as value
      FROM dials_with_cash
    `.trim()

    return sql
  }

  /**
   * Build a WHERE clause for meta_ad_performance using only safe filters
   * Safe fields: local_date | local_week | local_month, account_id
   */
  private buildMetaWhereClause(appliedFilters: any): string {
    const safeFields = new Set(['local_date', 'local_week', 'local_month', 'account_id'])
    const conditions = appliedFilters.conditions.filter((c: any) => safeFields.has(c.field))
    const params = { ...appliedFilters.params }
    // Ensure we don't pass user-specific params
    delete (params as any).rep_user_id
    delete (params as any).setter_user_id
    return buildWhereClause({ conditions, params }, []).replace('appointments.', 'meta_ad_performance.')
  }

  /**
   * Build a WHERE clause for appointments that strips rep/setter user filters
   * Used for account-wide totals like total_appointments
   */
  private buildAppointmentsWhereClauseWithoutUserFilters(appliedFilters: any): string {
    const filteredConditions = appliedFilters.conditions.filter((condition: any) => 
      !condition.field.includes('sales_rep_user_id') && 
      !condition.field.includes('setter_user_id')
    )
    const filteredParams = { ...appliedFilters.params }
    delete filteredParams.rep_user_id
    delete filteredParams.rep_user_ids
    delete filteredParams.setter_user_id
    delete filteredParams.setter_user_ids
    // Keep local_date/local_week/local_month as-is to align CPA and ROI denominators
    const clause = buildWhereClause({ conditions: filteredConditions, params: filteredParams }, [])
    return clause
  }

  /**
   * Build a WHERE clause for appointments that retains user filters and uses local_ date columns
   * This keeps ROI consistent with Cost Per Booked Call (appointments counted by local_date)
   */
  private buildAppointmentsWhereClauseUsingDateBooked(appliedFilters: any): string {
    const clause = buildWhereClause(appliedFilters, [])
    // Do not replace with date_booked; use local_date columns for consistency
    return clause
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