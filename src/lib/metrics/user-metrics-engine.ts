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
 * rather than role assumptions
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
   * Calculate appointment-based metrics for users
   */
  private async calculateAppointmentMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[]
  ): Promise<UserMetricResult[]> {
    
    // Build the base query conditions from the metric definition
    const whereConditions = [
      "account_id = $account_id",
      "created_at >= $start_date::timestamp",
      "created_at <= $end_date::timestamp"
    ]

    // Create individual user parameter conditions instead of array
    const userConditions: string[] = []
    const params: Record<string, any> = {
      account_id: accountId,
      start_date: startDate,
      end_date: endDate
    }

    // Add individual user parameters
    userIds.forEach((userId, index) => {
      const paramName = `user_id_${index}`
      params[paramName] = userId
      userConditions.push(`sales_rep_user_id = $${paramName} OR setter_user_id = $${paramName}`)
    })

    if (userConditions.length > 0) {
      whereConditions.push(`(${userConditions.join(' OR ')})`)
    }

    // Add metric-specific WHERE conditions
    if (metric.query.where) {
      whereConditions.push(...metric.query.where)
    }

    // Determine what we're calculating (COUNT, SUM, etc.)
    const selectField = metric.query.select[0]
    let aggregateFunction = 'COUNT(*)'
    
    if (selectField.includes('SUM(')) {
      const match = selectField.match(/SUM\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `SUM(${match[1]})`
      }
    } else if (selectField.includes('AVG(')) {
      const match = selectField.match(/AVG\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `AVG(${match[1]})`
      }
    } else if (selectField.includes('COALESCE')) {
      // Handle COALESCE expressions like "COALESCE(SUM(cash_collected), 0) as value"
      aggregateFunction = selectField.replace(' as value', '')
    }

    // Build user case conditions for the CTE
    const userCaseConditions = userIds.map((userId, index) => {
      const paramName = `user_id_${index}`
      return `WHEN sales_rep_user_id = $${paramName} THEN $${paramName}
              WHEN setter_user_id = $${paramName} THEN $${paramName}`
    }).join('\n        ')

    const roleCaseConditions = userIds.map((userId, index) => {
      const paramName = `user_id_${index}`
      return `WHEN sales_rep_user_id = $${paramName} THEN 'rep'
              WHEN setter_user_id = $${paramName} THEN 'setter'`
    }).join('\n        ')

    // Build SQL that groups by user and role
    const sql = `
      WITH user_metrics AS (
        SELECT 
          CASE 
            ${userCaseConditions}
            ELSE NULL
          END as user_id,
          CASE 
            ${roleCaseConditions}
            ELSE 'unknown'
          END as user_role,
          *
        FROM appointments
        WHERE ${whereConditions.join(' AND ')}
      )
      SELECT 
        user_id,
        user_role,
        ${aggregateFunction} as value
      FROM user_metrics
      WHERE user_id IS NOT NULL
      GROUP BY user_id, user_role
      ORDER BY user_id, user_role
    `

    console.log('Executing appointment metrics SQL:', sql)
    console.log('Parameters:', params)

    const { data, error } = await supabaseService
      .rpc('execute_metrics_query_array', {
        query_sql: sql,
        query_params: params
      })

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Process results to combine rep and setter values per user
    const results = Array.isArray(data) ? data : (data ? JSON.parse(String(data)) : [])
    return this.combineUserRoleResults(results, userIds)
  }

  /**
   * Calculate discovery-based metrics for users
   */
  private async calculateDiscoveryMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[]
  ): Promise<UserMetricResult[]> {
    
    const whereConditions = [
      "account_id = $account_id",
      "created_at >= $start_date::timestamp", 
      "created_at <= $end_date::timestamp"
    ]

    // Create individual user parameter conditions
    const userConditions: string[] = []
    const params: Record<string, any> = {
      account_id: accountId,
      start_date: startDate,
      end_date: endDate
    }

    userIds.forEach((userId, index) => {
      const paramName = `user_id_${index}`
      params[paramName] = userId
      userConditions.push(`sales_rep_user_id = $${paramName} OR setter_user_id = $${paramName}`)
    })

    if (userConditions.length > 0) {
      whereConditions.push(`(${userConditions.join(' OR ')})`)
    }

    if (metric.query.where) {
      whereConditions.push(...metric.query.where)
    }

    const selectField = metric.query.select[0]
    let aggregateFunction = 'COUNT(*)'
    
    if (selectField.includes('SUM(')) {
      const match = selectField.match(/SUM\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `SUM(${match[1]})`
      }
    } else if (selectField.includes('AVG(')) {
      const match = selectField.match(/AVG\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `AVG(${match[1]})`
      }
    } else if (selectField.includes('COALESCE')) {
      aggregateFunction = selectField.replace(' as value', '')
    }

    const userCaseConditions = userIds.map((userId, index) => {
      const paramName = `user_id_${index}`
      return `WHEN sales_rep_user_id = $${paramName} THEN $${paramName}
              WHEN setter_user_id = $${paramName} THEN $${paramName}`
    }).join('\n        ')

    const roleCaseConditions = userIds.map((userId, index) => {
      const paramName = `user_id_${index}`
      return `WHEN sales_rep_user_id = $${paramName} THEN 'rep'
              WHEN setter_user_id = $${paramName} THEN 'setter'`
    }).join('\n        ')

    const sql = `
      WITH user_metrics AS (
        SELECT 
          CASE 
            ${userCaseConditions}
            ELSE NULL
          END as user_id,
          CASE 
            ${roleCaseConditions}
            ELSE 'unknown'
          END as user_role,
          *
        FROM discoveries
        WHERE ${whereConditions.join(' AND ')}
      )
      SELECT 
        user_id,
        user_role,
        ${aggregateFunction} as value
      FROM user_metrics
      WHERE user_id IS NOT NULL
      GROUP BY user_id, user_role
      ORDER BY user_id, user_role
    `

    const { data, error } = await supabaseService
      .rpc('execute_metrics_query_array', {
        query_sql: sql,
        query_params: params
      })

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const results = Array.isArray(data) ? data : (data ? JSON.parse(String(data)) : [])
    return this.combineUserRoleResults(results, userIds)
  }

  /**
   * Calculate dial-based metrics for users  
   */
  private async calculateDialMetrics(
    metric: MetricDefinition,
    accountId: string,
    startDate: string,
    endDate: string,
    userIds: string[]
  ): Promise<UserMetricResult[]> {
    
    const whereConditions = [
      "account_id = $account_id",
      "created_at >= $start_date::timestamp",
      "created_at <= $end_date::timestamp"
    ]

    // Create individual user parameter conditions
    const userConditions: string[] = []
    const params: Record<string, any> = {
      account_id: accountId,
      start_date: startDate,
      end_date: endDate
    }

    userIds.forEach((userId, index) => {
      const paramName = `user_id_${index}`
      params[paramName] = userId
      userConditions.push(`setter_user_id = $${paramName}`)
    })

    if (userConditions.length > 0) {
      whereConditions.push(`(${userConditions.join(' OR ')})`)
    }

    if (metric.query.where) {
      whereConditions.push(...metric.query.where)
    }

    const selectField = metric.query.select[0]
    let aggregateFunction = 'COUNT(*)'
    
    if (selectField.includes('SUM(')) {
      const match = selectField.match(/SUM\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `SUM(${match[1]})`
      }
    } else if (selectField.includes('AVG(')) {
      const match = selectField.match(/AVG\(([^)]+)\)/)
      if (match) {
        aggregateFunction = `AVG(${match[1]})`
      }
    } else if (selectField.includes('COALESCE')) {
      aggregateFunction = selectField.replace(' as value', '')
    }

    const sql = `
      SELECT 
        setter_user_id as user_id,
        'setter' as user_role,
        ${aggregateFunction} as value
      FROM dials
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY setter_user_id
      ORDER BY setter_user_id
    `

    const { data, error } = await supabaseService
      .rpc('execute_metrics_query_array', {
        query_sql: sql,
        query_params: params
      })

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const results = Array.isArray(data) ? data : (data ? JSON.parse(String(data)) : [])
    return this.combineUserRoleResults(results, userIds)
  }

  /**
   * Combine results where users might have both rep and setter data
   */
  private combineUserRoleResults(rawResults: any[], allUserIds: string[]): UserMetricResult[] {
    // Group results by user_id
    const userResultsMap = new Map<string, { rep?: number, setter?: number }>()
    
    for (const row of rawResults) {
      const userId = row.user_id
      const role = row.user_role
      const value = Number(row.value || 0)
      
      if (!userResultsMap.has(userId)) {
        userResultsMap.set(userId, {})
      }
      
      const userResults = userResultsMap.get(userId)!
      if (role === 'rep') {
        userResults.rep = value
      } else if (role === 'setter') {
        userResults.setter = value
      }
    }

    // Create results for all requested users
    return allUserIds.map(userId => {
      const userResults = userResultsMap.get(userId)
      
      if (!userResults) {
        return {
          userId,
          value: 0,
          role: 'none' as const
        }
      }

      const repValue = userResults.rep || 0
      const setterValue = userResults.setter || 0
      
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