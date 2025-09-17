import { supabaseService } from '@/lib/supabase-server'
import { MetricDefinition } from './types'
import { getMetric } from './registry'

export interface UserMetricRequest {
  metricName: string
  accountId: string
  startDate: string
  endDate: string
  userIds: string[]
  options?: any
}

export interface UserMetricResult {
  userId: string
  value: number
  role: 'setter' | 'rep' | 'both' | 'none'
  breakdown?: {
    asRep?: number
    asSetter?: number
  }
  displayValue?: string // Formatted value based on options
}

export interface UserMetricsResponse {
  metricName: string
  results: UserMetricResult[]
  executedAt: string
  executionTimeMs: number
}

/**
 * User-centric metrics engine that calculates metrics based on actual data presence
 * using simple Supabase queries instead of complex SQL
 */
export class UserMetricsEngine {
  
  /**
   * Format a value based on metric unit and options
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

  /**
   * Calculate a metric for multiple users by analyzing their actual data presence
   */
  async calculateForUsers(request: UserMetricRequest): Promise<UserMetricsResponse> {
    const startTime = Date.now()
    
    try {
      // Get metric definition
      const metric = getMetric(request.metricName)
      if (!metric) {
        throw new Error(`Metric '${request.metricName}' not found`)
      }

      // Calculate metrics based on the table type
      const results = await this.calculateUserMetrics(metric, request)

      return {
        metricName: request.metricName,
        results,
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }

    } catch (error) {
      console.error('User metrics engine error:', error)
      
      // Return zero values for all users on error
      const results: UserMetricResult[] = request.userIds.map(userId => ({
        userId,
        value: 0,
        role: 'none'
      }))

      return {
        metricName: request.metricName,
        results,
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Calculate metrics for users based on the metric's table type
   */
  private async calculateUserMetrics(
    metric: MetricDefinition, 
    request: UserMetricRequest
  ): Promise<UserMetricResult[]> {
    
    const { table } = metric.query
    const { accountId, startDate, endDate, userIds, options } = request

    switch (table) {
      case 'appointments':
        return this.calculateAppointmentMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      case 'discoveries':
        return this.calculateDiscoveryMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      case 'dials':
        return this.calculateDialMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      case 'contacts':
        return this.calculateContactMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      case 'work_timeframes':
        return this.calculateWorkTimeframeMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      case 'meta_ad_performance':
        return this.calculateMetaAdMetrics(metric, accountId, startDate, endDate, userIds, options)
      
      default:
        throw new Error(`Unsupported table type: ${table}`)
    }
  }

  /**
   * Calculate appointment-based metrics for users using Supabase queries
   */
  private async calculateAppointmentMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating appointment metrics for users: ${userIds.join(', ')}`)

    // Build base query
    let query = supabaseService
      .from('appointments')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('data_filled', true)

    // Add metric-specific filters
    if (metric.query.where) {
      for (const condition of metric.query.where) {
        if (condition.includes("LOWER(call_outcome) = 'show'")) {
          query = query.ilike('call_outcome', 'show')
        } else if (condition.includes("show_outcome = 'won'")) {
          query = query.eq('show_outcome', 'won')
        }
        // Add more conditions as needed
      }
    }

    // Filter for users who appear as either rep or setter
    query = query.or(`sales_rep_user_id.in.(${userIds.join(',')}),setter_user_id.in.(${userIds.join(',')})`)

    const { data: appointments, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    console.log(`Found ${appointments?.length || 0} appointments`)

    // Process results by user and role
    return this.processResults(appointments || [], userIds, metric, 'appointments', options)
  }

  /**
   * Calculate discovery-based metrics for users using Supabase queries
   */
  private async calculateDiscoveryMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating discovery metrics for users: ${userIds.join(', ')}`)

    let query = supabaseService
      .from('discoveries')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('data_filled', true)

    // Add metric-specific filters
    if (metric.query.where) {
      for (const condition of metric.query.where) {
        if (condition.includes("call_outcome = 'show'")) {
          query = query.eq('call_outcome', 'show')
        }
        // Add more conditions as needed
      }
    }

    query = query.or(`sales_rep_user_id.in.(${userIds.join(',')}),setter_user_id.in.(${userIds.join(',')})`)

    const { data: discoveries, error } = await query

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    console.log(`Found ${discoveries?.length || 0} discoveries`)

    return this.processResults(discoveries || [], userIds, metric, 'discoveries', options)
  }

  /**
   * Calculate contact-based metrics for users using Supabase queries
   */
  private async calculateContactMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating contact metrics for users: ${userIds.join(', ')}`)

    // Special handling for Lead to Appointment ratio
    if (metric.name === 'Lead to Appointment') {
      return this.calculateLeadToAppointmentRatio(accountId, startDate, endDate, userIds, metric, options)
    }

    // For contacts, we need to look at appointments and discoveries to see which users are associated
    // Since contacts don't have direct user attribution, we'll count contacts via appointments/discoveries
    let query = supabaseService
      .from('contacts')
      .select(`
        id,
        ghl_created_at,
        appointments!inner(setter_user_id, sales_rep_user_id),
        discoveries!inner(setter_user_id, sales_rep_user_id)
      `)
      .eq('account_id', accountId)
      .gte('ghl_created_at', startDate)
      .lte('ghl_created_at', endDate)
      .not('ghl_created_at', 'is', null)

    const { data: contacts, error } = await query

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    console.log(`Found ${contacts?.length || 0} contacts`)

    // For contacts, we need to count unique contacts per user based on appointments/discoveries
    const userStats = new Map<string, Set<string>>() // userId -> Set of contact IDs
    
    // Initialize all users
    userIds.forEach(userId => {
      userStats.set(userId, new Set())
    })

    // Process contacts through appointments and discoveries
    contacts?.forEach(contact => {
      // Count contact for setters/reps in appointments
      contact.appointments?.forEach((apt: any) => {
        if (apt.setter_user_id && userIds.includes(apt.setter_user_id)) {
          userStats.get(apt.setter_user_id)!.add(contact.id)
        }
        if (apt.sales_rep_user_id && userIds.includes(apt.sales_rep_user_id)) {
          userStats.get(apt.sales_rep_user_id)!.add(contact.id)
        }
      })

      // Count contact for setters/reps in discoveries  
      contact.discoveries?.forEach((disc: any) => {
        if (disc.setter_user_id && userIds.includes(disc.setter_user_id)) {
          userStats.get(disc.setter_user_id)!.add(contact.id)
        }
        if (disc.sales_rep_user_id && userIds.includes(disc.sales_rep_user_id)) {
          userStats.get(disc.sales_rep_user_id)!.add(contact.id)
        }
      })
    })

    // Convert to results format
    return userIds.map(userId => {
      const contactSet = userStats.get(userId)!
      const uniqueContactCount = contactSet.size
      const role = uniqueContactCount > 0 ? 'both' : 'none' // Contacts can be attributed to both setters and reps
      
      return {
        userId,
        value: uniqueContactCount,
        role,
        displayValue: this.formatValue(uniqueContactCount, metric, options)
      }
    })
  }

  /**
   * Calculate Lead to Appointment ratio for users
   */
  private async calculateLeadToAppointmentRatio(
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    metric: MetricDefinition,
    options?: any
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating Lead to Appointment ratio for users: ${userIds.join(', ')}`)

    // Get contacts and appointments for each user
    const userStats = new Map<string, { contacts: Set<string>, appointments: number }>()
    
    // Initialize all users
    userIds.forEach(userId => {
      userStats.set(userId, { contacts: new Set(), appointments: 0 })
    })

    // Get contacts via appointments and discoveries
    const { data: contacts, error: contactsError } = await supabaseService
      .from('contacts')
      .select(`
        id,
        appointments!inner(setter_user_id, sales_rep_user_id),
        discoveries!inner(setter_user_id, sales_rep_user_id)
      `)
      .eq('account_id', accountId)
      .gte('ghl_created_at', startDate)
      .lte('ghl_created_at', endDate)
      .not('ghl_created_at', 'is', null)

    if (contactsError) {
      throw new Error(`Database query failed: ${contactsError.message}`)
    }

    // Get appointments for each user
    const { data: appointments, error: appointmentsError } = await supabaseService
      .from('appointments')
      .select('setter_user_id, sales_rep_user_id')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (appointmentsError) {
      throw new Error(`Database query failed: ${appointmentsError.message}`)
    }

    // Count contacts per user
    contacts?.forEach(contact => {
      contact.appointments?.forEach((apt: any) => {
        if (apt.setter_user_id && userIds.includes(apt.setter_user_id)) {
          userStats.get(apt.setter_user_id)!.contacts.add(contact.id)
        }
        if (apt.sales_rep_user_id && userIds.includes(apt.sales_rep_user_id)) {
          userStats.get(apt.sales_rep_user_id)!.contacts.add(contact.id)
        }
      })

      contact.discoveries?.forEach((disc: any) => {
        if (disc.setter_user_id && userIds.includes(disc.setter_user_id)) {
          userStats.get(disc.setter_user_id)!.contacts.add(contact.id)
        }
        if (disc.sales_rep_user_id && userIds.includes(disc.sales_rep_user_id)) {
          userStats.get(disc.sales_rep_user_id)!.contacts.add(contact.id)
        }
      })
    })

    // Count appointments per user
    appointments?.forEach(appointment => {
      if (appointment.setter_user_id && userIds.includes(appointment.setter_user_id)) {
        userStats.get(appointment.setter_user_id)!.appointments += 1
      }
      if (appointment.sales_rep_user_id && userIds.includes(appointment.sales_rep_user_id)) {
        userStats.get(appointment.sales_rep_user_id)!.appointments += 1
      }
    })

    // Calculate ratio for each user
    return userIds.map(userId => {
      const stats = userStats.get(userId)!
      const contactCount = stats.contacts.size
      const appointmentCount = stats.appointments
      
      const ratio = contactCount > 0 ? appointmentCount / contactCount : 0
      const role = contactCount > 0 || appointmentCount > 0 ? 'both' : 'none'
      
      return {
        userId,
        value: ratio,
        role,
        displayValue: this.formatValue(ratio, metric, options)
      }
    })
  }

  /**
   * Calculate dial-based metrics for users using Supabase queries
   */
  private async calculateDialMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating dial metrics for users: ${userIds.join(', ')}`)

    let query = supabaseService
      .from('dials')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // Add metric-specific filters
    if (metric.query.where) {
      for (const condition of metric.query.where) {
        // Add dial-specific conditions as needed
      }
    }

    // For dials, only setters are relevant
    query = query.in('setter_user_id', userIds)

    const { data: dials, error } = await query

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    console.log(`Found ${dials?.length || 0} dials`)

    return this.processResults(dials || [], userIds, metric, 'dials', options)
  }

  /**
   * Process results for average duration metrics (with options support)
   */
  private processAverageDurationResults(
    data: any[], 
    userIds: string[], 
    tableType: 'appointments' | 'discoveries' | 'dials',
    metric: MetricDefinition,
    options?: any
  ): UserMetricResult[] {
    
    // Group data by user and calculate average duration
    const userStats = new Map<string, { totalDuration: number, count: number }>()
    
    // Initialize all users
    userIds.forEach(userId => {
      userStats.set(userId, { totalDuration: 0, count: 0 })
    })

    // Process each record
    for (const record of data) {
      const setterId = record.setter_user_id
      const duration = record.duration || 0

      // Add to setter stats (duration metrics are typically setter-based)
      if (setterId && userIds.includes(setterId) && duration > 0) {
        const stats = userStats.get(setterId)!
        stats.totalDuration += duration
        stats.count += 1
      }
    }

    // Convert to results format with average calculation
    return userIds.map(userId => {
      const stats = userStats.get(userId)!
      const avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0
      const role = stats.count > 0 ? 'setter' : 'none'
      
      return {
        userId,
        value: Math.round(avgDuration * 100) / 100, // Round to 2 decimal places
        role,
        displayValue: this.formatValue(avgDuration, metric, options)
      }
    })
  }

  /**
   * Process results for average cash collected metrics
   */
  private processAverageCashResults(
    data: any[], 
    userIds: string[], 
    tableType: 'appointments' | 'discoveries' | 'dials',
    attributionContext?: 'assigned' | 'booked' | 'dialer'
  ): UserMetricResult[] {
    
    // Track sum and count for each user and role
    const userStats = new Map<string, { 
      rep: { sum: number, count: number }, 
      setter: { sum: number, count: number } 
    }>()
    
    // Initialize all users
    userIds.forEach(userId => {
      userStats.set(userId, { 
        rep: { sum: 0, count: 0 }, 
        setter: { sum: 0, count: 0 } 
      })
    })

          // Process each record based on attribution context
    for (const record of data) {
      const repId = record.sales_rep_user_id
      const setterId = record.setter_user_id
      const cashValue = Number(record.cash_collected || 0)

      // Handle single attribution context
      if (attributionContext) {
        let targetUserId: string | null = null
        
        switch (attributionContext) {
          case 'assigned':
            targetUserId = repId
            break
          case 'booked':
            targetUserId = setterId
            break
          case 'dialer':
            if (tableType === 'dials') {
              targetUserId = setterId
            }
            break
        }

        if (targetUserId && userIds.includes(targetUserId)) {
          const stats = userStats.get(targetUserId)!
          // For single attribution, use the 'setter' bucket for simplicity
          stats.setter.sum += cashValue
          stats.setter.count += 1
        }
      } else {
        // Legacy behavior: add to both rep and setter stats
        if (repId && userIds.includes(repId)) {
          const stats = userStats.get(repId)!
          stats.rep.sum += cashValue
          stats.rep.count += 1
        }

        if (setterId && userIds.includes(setterId)) {
          const stats = userStats.get(setterId)!
          stats.setter.sum += cashValue
          stats.setter.count += 1
        }
      }
    }

    // Convert to results format with proper averaging
    return userIds.map(userId => {
      const stats = userStats.get(userId)!
      
      if (attributionContext) {
        // Single attribution context
        const avg = stats.setter.count > 0 ? stats.setter.sum / stats.setter.count : 0
        return {
          userId,
          value: avg,
          role: this.determineUserRole(userId, avg, attributionContext)
        }
      } else {
        // Legacy behavior: handle both rep and setter stats
        const repAvg = stats.rep.count > 0 ? stats.rep.sum / stats.rep.count : 0
        const setterAvg = stats.setter.count > 0 ? stats.setter.sum / stats.setter.count : 0
        
        // Determine role and combined value
        let role: 'setter' | 'rep' | 'both' | 'none'
        let value: number
        
        if (repAvg > 0 && setterAvg > 0) {
          role = 'both'
          // For averages, we need to calculate the overall average across all appointments
          const totalSum = stats.rep.sum + stats.setter.sum
          const totalCount = stats.rep.count + stats.setter.count
          value = totalCount > 0 ? totalSum / totalCount : 0
        } else if (repAvg > 0) {
          role = 'rep'
          value = repAvg
        } else if (setterAvg > 0) {
          role = 'setter'
          value = setterAvg
        } else {
          role = 'none'
          value = 0
        }

        const result: UserMetricResult = {
          userId,
          value,
          role
        }

        // Add breakdown for users with both roles
        if (role === 'both') {
          result.breakdown = {
            asRep: repAvg,
            asSetter: setterAvg
          }
        }

        return result
      }
    })
  }

  /**
   * Process results for single attribution metrics (assigned, booked, or dialer)
   */
  private processSingleAttributionResults(
    data: any[], 
    userIds: string[], 
    metric: MetricDefinition,
    tableType: 'appointments' | 'discoveries' | 'dials'
  ): UserMetricResult[] {
    
    // Map to track values for each user
    const userValues = new Map<string, number>()
    
    // Initialize all users
    userIds.forEach(userId => {
      userValues.set(userId, 0)
    })

    // Process each record based on attribution context
    for (const record of data) {
      const repId = record.sales_rep_user_id
      const setterId = record.setter_user_id

      // Calculate the value for this record based on metric type
      let recordValue = this.calculateRecordValue(record, metric, 'unknown')

      // Attribute based on context
      let targetUserId: string | null = null
      
      switch (metric.attributionContext) {
        case 'assigned':
          // For appointments/discoveries: sales_rep_user_id
          // For dials: not applicable (dials don't have sales_rep_user_id)
          if (tableType !== 'dials') {
            targetUserId = repId
          }
          break
          
        case 'booked':
          // For appointments: setter_user_id (who booked it)
          // For discoveries: setter_user_id (who was assigned)
          // For dials: setter_user_id (who made the dial)
          targetUserId = setterId
          break
          
        case 'dialer':
          // Only for dials: setter_user_id (who made the dial)
          if (tableType === 'dials') {
            targetUserId = setterId
          }
          break
      }

      // Add to the target user's value
      if (targetUserId && userIds.includes(targetUserId)) {
        const currentValue = userValues.get(targetUserId)!
        userValues.set(targetUserId, currentValue + recordValue)
      }
    }

    // Convert to results format
    return userIds.map(userId => {
      const value = userValues.get(userId)!
      
      return {
        userId,
        value,
        role: this.determineUserRole(userId, value, metric.attributionContext!)
      }
    })
  }

  /**
   * Calculate the value for a single record based on metric type
   */
  private calculateRecordValue(record: any, metric: MetricDefinition, metricName?: string): number {
    const selectClause = metric.query.select[0]
    
    // Handle different aggregation types
    if (selectClause.includes('SUM(cash_collected)')) {
      return Number(record.cash_collected || 0)
    }
    
    if (selectClause.includes('AVG(cash_collected)')) {
      return Number(record.cash_collected || 0)
    }
    
    // Handle rate calculations that need special processing
    if (selectClause.includes('CASE WHEN') && selectClause.includes('show_outcome')) {
      // For rate calculations, we need to track both numerator and denominator
      // This is handled differently in the aggregation logic
      return 1 // Count the record, rate calculation happens in aggregation
    }
    
    // Handle cross-table metrics
    if (metricName === 'cash_per_dial') {
      // For cash per dial, this is a complex calculation that needs special handling
      return 1 // Count the dial
    }
    
    // Default: COUNT aggregation
    return 1
  }

  /**
   * Determine user role based on attribution context
   */
  private determineUserRole(
    userId: string, 
    value: number, 
    context: 'assigned' | 'booked' | 'dialer'
  ): 'setter' | 'rep' | 'both' | 'none' {
    if (value === 0) return 'none'
    
    switch (context) {
      case 'assigned':
        return 'rep'
      case 'booked':
        return 'setter'
      case 'dialer':
        return 'setter'
      default:
        return 'none'
    }
  }

  /**
   * Process raw data results into user metrics
   */
  private processResults(
    data: any[], 
    userIds: string[], 
    metric: MetricDefinition, 
    tableType: 'appointments' | 'discoveries' | 'dials',
    options?: any
  ): UserMetricResult[] {
    
    const isAverageMetric = metric.query.select[0].includes('AVG(')
    const isCashCollectedMetric = metric.query.select[0].includes('cash_collected')
    const isDurationMetric = metric.query.select[0].includes('duration')
    
    // For average cash metrics, use special processing
    if (isAverageMetric && isCashCollectedMetric) {
      return this.processAverageCashResults(data, userIds, tableType, metric.attributionContext)
    }
    
    // For average duration metrics, use special processing with options support
    if (isAverageMetric && isDurationMetric) {
      return this.processAverageDurationResults(data, userIds, tableType, metric, options)
    }
    
    // Handle attribution context for single attribution metrics
    if (metric.attributionContext) {
      return this.processSingleAttributionResults(data, userIds, metric, tableType)
    }
    
    // Group data by user and role
    const userStats = new Map<string, { rep: number, setter: number }>()
    
    // Initialize all users
    userIds.forEach(userId => {
      userStats.set(userId, { rep: 0, setter: 0 })
    })

    // Process each record
    for (const record of data) {
      const repId = record.sales_rep_user_id
      const setterId = record.setter_user_id

      // Calculate the value for this record based on metric type
      let recordValue = this.calculateRecordValue(record, metric)

      // Add to rep stats
      if (repId && userIds.includes(repId)) {
        const stats = userStats.get(repId)!
        stats.rep += recordValue
      }

      // Add to setter stats (only for appointments/discoveries, not dials)
      if (setterId && userIds.includes(setterId)) {
        const stats = userStats.get(setterId)!
        if (tableType === 'dials') {
          stats.setter += recordValue
        } else {
          stats.setter += recordValue
        }
      }
    }

    // Convert to results format
    return userIds.map(userId => {
      const stats = userStats.get(userId)!
      const repValue = stats.rep
      const setterValue = stats.setter
      
      // Determine role and combined value
      let role: 'setter' | 'rep' | 'both' | 'none'
      let value: number
      
      if (repValue > 0 && setterValue > 0) {
        role = 'both'
        value = repValue + setterValue
      } else if (repValue > 0) {
        role = 'rep'
        value = repValue
      } else if (setterValue > 0) {
        role = 'setter'
        value = setterValue
      } else {
        role = 'none'
        value = 0
      }

      const result: UserMetricResult = {
        userId,
        value,
        role,
        displayValue: this.formatValue(value, metric, options)
      }

      // Add breakdown for users with both roles
      if (role === 'both') {
        result.breakdown = {
          asRep: repValue,
          asSetter: setterValue
        }
      }

      return result
    })
  }

  /**
   * Calculate work timeframe metrics for users (calculated on-demand from dials data)
   */
  private async calculateWorkTimeframeMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    // Get account timezone
    const { data: account, error: accountError } = await supabaseService
      .from('accounts')
      .select('business_timezone')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      console.error('Error fetching account timezone:', accountError)
      return userIds.map(userId => ({ userId, value: 0, role: 'none' }))
    }

    const timezone = account.business_timezone || 'UTC'

    // Query dials data for all users to calculate work hours on-demand
    const { data: dials, error } = await supabaseService
      .from('dials')
      .select('setter_user_id, created_at, booked')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('setter_user_id', userIds)
      .not('setter_user_id', 'is', null)

    if (error) {
      console.error('Error fetching dials for work timeframes:', error)
      return userIds.map(userId => ({ userId, value: 0, role: 'none' }))
    }

    // Calculate work metrics for each user
    const userMetrics = new Map<string, { totalHours: number, totalBookings: number, totalDials: number }>()
    
    // Group dials by user and date (in their timezone)
    const userDateDials = new Map<string, Map<string, any[]>>()
    
    dials?.forEach(dial => {
      if (!dial.setter_user_id) return
      
      // Convert to user's local date
      const localDate = new Date(dial.created_at).toLocaleDateString('en-CA', { 
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

    // Calculate work hours for each user
    userIds.forEach(userId => {
      const userDates = userDateDials.get(userId)
      if (!userDates) {
        userMetrics.set(userId, { totalHours: 0, totalBookings: 0, totalDials: 0 })
        return
      }

      let totalHours = 0
      let totalBookings = 0
      let totalDials = 0

      // Calculate for each day
      userDates.forEach(dayDials => {
        if (dayDials.length === 0) return

        // Sort by time to get first and last
        const sortedDials = dayDials.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        const firstDial = new Date(sortedDials[0].created_at)
        const lastDial = new Date(sortedDials[sortedDials.length - 1].created_at)
        
        // Calculate work hours for this day (minimum 0.1 to avoid division by zero)
        const dayHours = Math.max(
          (lastDial.getTime() - firstDial.getTime()) / (1000 * 60 * 60),
          0.1
        )
        
        totalHours += dayHours
        totalDials += dayDials.length
        totalBookings += dayDials.filter(d => d.booked === true).length
      })

      userMetrics.set(userId, { totalHours, totalBookings, totalDials })
    })

    // Return results based on metric type
    return userIds.map(userId => {
      const userMetric = userMetrics.get(userId) || { totalHours: 0, totalBookings: 0, totalDials: 0 }
      
      let value = 0
      if (metric.name === 'Bookings per Hour') {
        value = userMetric.totalHours > 0 ? userMetric.totalBookings / userMetric.totalHours : 0
      } else if (metric.name === 'Dials per Hour') {
        value = userMetric.totalHours > 0 ? userMetric.totalDials / userMetric.totalHours : 0
      } else if (metric.name === 'Hours Worked') {
        value = userMetric.totalHours
      }
      
      const roundedValue = Math.round(value * 100) / 100 // Round to 2 decimal places
      
      return {
        userId,
        value: roundedValue,
        role: 'setter', // Work timeframes are always setter-based
        displayValue: this.formatValue(roundedValue, metric, options)
      }
    })
  }

  /**
   * Calculate Meta ad metrics for users
   */
  private async calculateMetaAdMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[],
    options?: any
  ): Promise<UserMetricResult[]> {
    
    // For now, return zeros since Meta ads attribution to individual users needs more complex logic
    // This can be enhanced later when we implement proper Meta ads attribution
    return userIds.map(userId => ({
      userId,
      value: 0,
      role: 'none'
    }))
  }
}

// Export singleton instance
export const userMetricsEngine = new UserMetricsEngine() 