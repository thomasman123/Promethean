import { MetricFilters } from './types'

export interface FilterCondition {
  field: string
  operator: string
  value: any
  paramName: string
}

export interface AppliedFilters {
  conditions: FilterCondition[]
  params: Record<string, any>
}

/**
 * Check if a string is a valid UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Applies standard filters to any metric query
 * Returns SQL conditions and parameters for safe execution
 */
export function applyStandardFilters(filters: MetricFilters): AppliedFilters {
  const conditions: FilterCondition[] = []
  const params: Record<string, any> = {}

  // Date range filter - always applied
  conditions.push({
    field: 'date_booked_for',
    operator: '>=',
    value: filters.dateRange.start,
    paramName: 'start_date'
  })
  
  conditions.push({
    field: 'date_booked_for',
    operator: '<=', 
    value: filters.dateRange.end,
    paramName: 'end_date'
  })
  
  params.start_date = filters.dateRange.start
  params.end_date = filters.dateRange.end

  // Account filter - always applied
  conditions.push({
    field: 'account_id',
    operator: '=',
    value: filters.accountId,
    paramName: 'account_id'
  })
  params.account_id = filters.accountId

  // Rep filter - applied if repIds provided (UUID only)
  if (filters.repIds && filters.repIds.length > 0) {
    // Validate all IDs are UUIDs
    const validRepIds = filters.repIds.filter(id => isValidUUID(id))
    if (validRepIds.length === 0) {
      console.warn('⚠️ All rep IDs are invalid (non-UUID), skipping rep filter')
    } else if (validRepIds.length !== filters.repIds.length) {
      console.warn('⚠️ Some rep IDs are invalid (non-UUID), filtering to valid ones only')
    }
    
    if (validRepIds.length > 0) {
      if (validRepIds.length === 1) {
        conditions.push({
          field: 'sales_rep_user_id',
          operator: '=',
          value: validRepIds[0],
          paramName: 'rep_id'
        })
        params.rep_id = validRepIds[0]
      } else {
        conditions.push({
          field: 'sales_rep_user_id',
          operator: 'IN',
          value: validRepIds,
          paramName: 'rep_ids'
        })
        params.rep_ids = validRepIds
      }
    }
  }

  // Setter filter - applied if setterIds provided (UUID only)
  if (filters.setterIds && filters.setterIds.length > 0) {
    // Validate all IDs are UUIDs
    const validSetterIds = filters.setterIds.filter(id => isValidUUID(id))
    if (validSetterIds.length === 0) {
      console.warn('⚠️ All setter IDs are invalid (non-UUID), skipping setter filter')
    } else if (validSetterIds.length !== filters.setterIds.length) {
      console.warn('⚠️ Some setter IDs are invalid (non-UUID), filtering to valid ones only')
    }
    
    if (validSetterIds.length > 0) {
      if (validSetterIds.length === 1) {
        conditions.push({
          field: 'setter_user_id',
          operator: '=',
          value: validSetterIds[0],
          paramName: 'setter_id'
        })
        params.setter_id = validSetterIds[0]
      } else {
        conditions.push({
          field: 'setter_user_id',
          operator: 'IN',
          value: validSetterIds,
          paramName: 'setter_ids'
        })
        params.setter_ids = validSetterIds
      }
    }
  }

  return { conditions, params }
}

/**
 * Converts filter conditions to SQL WHERE clause
 */
export function buildWhereClause(appliedFilters: AppliedFilters, additionalWhere?: string[]): string {
  const conditions: string[] = []
  
  // Add standard filter conditions
  for (const condition of appliedFilters.conditions) {
    if (condition.operator === 'IN') {
      // For IN operations, we need to handle arrays differently
      const placeholders = condition.value.map((_: any, index: number) => `$${condition.paramName}_${index}`).join(', ')
      conditions.push(`${condition.field} IN (${placeholders})`)
    } else {
      conditions.push(`${condition.field} ${condition.operator} $${condition.paramName}`)
    }
  }
  
  // Add any additional where conditions from the metric definition
  if (additionalWhere && additionalWhere.length > 0) {
    conditions.push(...additionalWhere)
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

/**
 * Flattens parameters for IN operations to work with Supabase
 */
export function flattenParams(appliedFilters: AppliedFilters): Record<string, any> {
  const flatParams: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(appliedFilters.params)) {
    if (Array.isArray(value)) {
      // For arrays, create individual parameters
      value.forEach((item, index) => {
        flatParams[`${key}_${index}`] = item
      })
    } else {
      flatParams[key] = value
    }
  }
  
  return flatParams
}

/**
 * Validates that required filters are present
 */
export function validateFilters(filters: MetricFilters): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!filters.dateRange.start) {
    errors.push('Start date is required')
  }
  
  if (!filters.dateRange.end) {
    errors.push('End date is required')
  }
  
  if (!filters.accountId) {
    errors.push('Account ID is required')
  }
  
  // Validate date format (basic check)
  try {
    new Date(filters.dateRange.start)
    new Date(filters.dateRange.end)
  } catch {
    errors.push('Invalid date format')
  }
  
  // Validate date order
  if (new Date(filters.dateRange.start) > new Date(filters.dateRange.end)) {
    errors.push('Start date must be before end date')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
} 