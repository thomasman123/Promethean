import { createServerClient } from '@supabase/ssr'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns'

export interface KPIDefinition {
  id: string
  account_id: string
  name: string
  description?: string
  metric_key: string
  target_value: number
  target_type: 'minimum' | 'maximum' | 'exact'
  period_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  period_days?: number
  applies_to: 'user' | 'account'
  assigned_user_ids?: string[]
  assigned_roles?: string[]
  is_active: boolean
}

export interface KPIProgress {
  id: string
  kpi_definition_id: string
  user_id: string | null
  period_start: string
  period_end: string
  current_value: number
  target_value: number
  progress_percentage: number
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded'
  last_updated: string
}

/**
 * Calculate the current period dates based on period type
 */
export function getCurrentPeriod(periodType: 'daily' | 'weekly' | 'monthly' | 'custom', periodDays?: number): { start: Date; end: Date } {
  const now = new Date()
  
  switch (periodType) {
    case 'daily':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      }
    
    case 'weekly':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 })
      }
    
    case 'monthly':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      }
    
    case 'custom':
      if (!periodDays) periodDays = 7
      return {
        start: startOfDay(now),
        end: endOfDay(addDays(now, periodDays - 1))
      }
    
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      }
  }
}

/**
 * Calculate KPI value by calling the metrics API
 */
export async function calculateKPIValue(
  kpiDefinition: KPIDefinition,
  userId: string | null,
  accountId: string,
  periodStart: Date,
  periodEnd: Date,
  supabaseUrl: string,
  supabaseKey: string
): Promise<number> {
  try {
    // Call the metrics API to get the current value
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_metric_value`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        p_metric_key: kpiDefinition.metric_key,
        p_account_id: accountId,
        p_user_id: userId,
        p_start_date: format(periodStart, 'yyyy-MM-dd'),
        p_end_date: format(periodEnd, 'yyyy-MM-dd')
      })
    })

    if (!response.ok) {
      console.error('Failed to fetch metric value:', await response.text())
      return 0
    }

    const data = await response.json()
    return data || 0
  } catch (error) {
    console.error('Error calculating KPI value:', error)
    return 0
  }
}

/**
 * Determine KPI status based on current value and target
 */
export function getKPIStatus(
  currentValue: number,
  targetValue: number,
  targetType: 'minimum' | 'maximum' | 'exact',
  periodEnd: Date
): 'on_track' | 'at_risk' | 'behind' | 'exceeded' {
  const progressPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0
  const now = new Date()
  const daysUntilEnd = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (targetType === 'minimum') {
    // For minimum targets, we want to reach or exceed the target
    if (progressPercentage >= 100) {
      return 'exceeded'
    } else if (daysUntilEnd <= 0) {
      return 'behind'
    } else {
      // Calculate expected progress based on time elapsed
      const totalDays = Math.ceil((periodEnd.getTime() - now.getTime() + (now.getTime())) / (1000 * 60 * 60 * 24))
      const daysElapsed = totalDays - daysUntilEnd
      const expectedProgress = (daysElapsed / totalDays) * 100
      
      if (progressPercentage >= expectedProgress * 0.9) {
        return 'on_track'
      } else if (progressPercentage >= expectedProgress * 0.7) {
        return 'at_risk'
      } else {
        return 'behind'
      }
    }
  } else if (targetType === 'maximum') {
    // For maximum targets, we want to stay under the target
    if (currentValue <= targetValue) {
      return 'on_track'
    } else if (currentValue <= targetValue * 1.1) {
      return 'at_risk'
    } else {
      return 'behind'
    }
  } else {
    // For exact targets
    const variance = Math.abs(currentValue - targetValue) / targetValue
    if (variance < 0.05) {
      return 'on_track'
    } else if (currentValue > targetValue) {
      return 'exceeded'
    } else if (variance < 0.15) {
      return 'at_risk'
    } else {
      return 'behind'
    }
  }
}

/**
 * Update or create KPI progress record
 */
export async function updateKPIProgress(
  supabase: any,
  kpiDefinitionId: string,
  userId: string | null,
  periodStart: Date,
  periodEnd: Date,
  currentValue: number,
  targetValue: number
): Promise<void> {
  const status = getKPIStatus(currentValue, targetValue, 'minimum', periodEnd)
  
  const { error } = await supabase
    .from('kpi_progress')
    .upsert({
      kpi_definition_id: kpiDefinitionId,
      user_id: userId,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      current_value: currentValue,
      target_value: targetValue,
      status,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'kpi_definition_id,user_id,period_start'
    })
  
  if (error) {
    console.error('Error updating KPI progress:', error)
    throw error
  }
}

/**
 * Archive completed period to history
 */
export async function archiveKPIToHistory(
  supabase: any,
  kpiDefinitionId: string,
  userId: string | null,
  periodStart: Date,
  periodEnd: Date,
  finalValue: number,
  targetValue: number,
  targetType: 'minimum' | 'maximum' | 'exact'
): Promise<void> {
  let achieved = false
  
  if (targetType === 'minimum') {
    achieved = finalValue >= targetValue
  } else if (targetType === 'maximum') {
    achieved = finalValue <= targetValue
  } else {
    const variance = Math.abs(finalValue - targetValue) / targetValue
    achieved = variance < 0.05
  }
  
  const { error } = await supabase
    .from('kpi_history')
    .insert({
      kpi_definition_id: kpiDefinitionId,
      user_id: userId,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      final_value: finalValue,
      target_value: targetValue,
      achieved
    })
  
  if (error) {
    console.error('Error archiving KPI to history:', error)
  }
}

/**
 * Get users assigned to a KPI
 */
export async function getAssignedUsers(
  supabase: any,
  accountId: string,
  assignedUserIds?: string[],
  assignedRoles?: string[]
): Promise<string[]> {
  // If specific users are assigned, return those
  if (assignedUserIds && assignedUserIds.length > 0) {
    return assignedUserIds
  }
  
  // Otherwise, get all users in the account, optionally filtered by role
  let query = supabase
    .from('account_access')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('is_active', true)
  
  if (assignedRoles && assignedRoles.length > 0) {
    query = query.in('role', assignedRoles)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching assigned users:', error)
    return []
  }
  
  return data.map((row: any) => row.user_id)
}

