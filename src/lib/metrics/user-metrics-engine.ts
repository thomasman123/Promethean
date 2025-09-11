import { supabaseService } from '@/lib/supabase-server'
import { MetricDefinition } from './types'
import { getMetric } from './registry'

export interface UserMetricRequest {
  metricName: string
  accountId: string
  startDate: string
  endDate: string
  userIds: string[]
}

export interface UserMetricResult {
  userId: string
  value: number
  role: 'setter' | 'rep' | 'both' | 'none'
  breakdown?: {
    asRep?: number
    asSetter?: number
  }
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
    const { accountId, startDate, endDate, userIds } = request

    switch (table) {
      case 'appointments':
        return this.calculateAppointmentMetrics(metric, accountId, startDate, endDate, userIds)
      
      case 'discoveries':
        return this.calculateDiscoveryMetrics(metric, accountId, startDate, endDate, userIds)
      
      case 'dials':
        return this.calculateDialMetrics(metric, accountId, startDate, endDate, userIds)
      
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
    userIds: string[]
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating appointment metrics for users: ${userIds.join(', ')}`)

    // Build base query
    let query = supabaseService
      .from('appointments')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

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
    return this.processResults(appointments || [], userIds, metric, 'appointments')
  }

  /**
   * Calculate discovery-based metrics for users using Supabase queries
   */
  private async calculateDiscoveryMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[]
  ): Promise<UserMetricResult[]> {
    
    console.log(`Calculating discovery metrics for users: ${userIds.join(', ')}`)

    let query = supabaseService
      .from('discoveries')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

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

    return this.processResults(discoveries || [], userIds, metric, 'discoveries')
  }

  /**
   * Calculate dial-based metrics for users using Supabase queries
   */
  private async calculateDialMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[]
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

    return this.processResults(dials || [], userIds, metric, 'dials')
  }

  /**
   * Process results for average cash collected metrics
   */
  private processAverageCashResults(
    data: any[], 
    userIds: string[], 
    tableType: 'appointments' | 'discoveries' | 'dials'
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

    // Process each record
    for (const record of data) {
      const repId = record.sales_rep_user_id
      const setterId = record.setter_user_id
      const cashValue = Number(record.cash_collected || 0)

      // Add to rep stats
      if (repId && userIds.includes(repId)) {
        const stats = userStats.get(repId)!
        stats.rep.sum += cashValue
        stats.rep.count += 1
      }

      // Add to setter stats
      if (setterId && userIds.includes(setterId)) {
        const stats = userStats.get(setterId)!
        stats.setter.sum += cashValue
        stats.setter.count += 1
      }
    }

    // Convert to results format with proper averaging
    return userIds.map(userId => {
      const stats = userStats.get(userId)!
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
    })
  }

  /**
   * Process raw data results into user metrics
   */
  private processResults(
    data: any[], 
    userIds: string[], 
    metric: MetricDefinition, 
    tableType: 'appointments' | 'discoveries' | 'dials'
  ): UserMetricResult[] {
    
    const isAverageMetric = metric.query.select[0].includes('AVG(')
    const isCashCollectedMetric = metric.query.select[0].includes('cash_collected')
    
    // For average metrics, we need to track both sum and count
    if (isAverageMetric && isCashCollectedMetric) {
      return this.processAverageCashResults(data, userIds, tableType)
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
      let recordValue = 1 // Default for COUNT
      
      if (metric.query.select[0].includes('SUM(cash_collected)')) {
        recordValue = Number(record.cash_collected || 0)
      }
      // Add more value calculations as needed

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
        role
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
}

// Export singleton instance
export const userMetricsEngine = new UserMetricsEngine() 