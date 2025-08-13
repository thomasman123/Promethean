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

  // Rep filter - applied if repIds provided
  if (filters.repIds && filters.repIds.length > 0) {
    if (filters.repIds.length === 1) {
      const repId = filters.repIds[0]
      // Check if it's a UUID or GHL ID based on format
      if (isUUID(repId)) {
        conditions.push({
          field: 'sales_rep_user_id',
          operator: '=',
          value: repId,
          paramName: 'rep_id'
        })
        params.rep_id = repId
      } else {
        // It's a GHL ID, use the ghl_id column
        conditions.push({
          field: 'sales_rep_ghl_id',
          operator: '=',
          value: repId,
          paramName: 'rep_ghl_id'
        })
        params.rep_ghl_id = repId
      }
    } else {
      // Multiple IDs - separate UUIDs from GHL IDs
      const uuids = filters.repIds.filter(id => isUUID(id))
      const ghlIds = filters.repIds.filter(id => !isUUID(id))
      
      const orConditions: string[] = []
      
      if (uuids.length > 0) {
        if (uuids.length === 1) {
          orConditions.push('sales_rep_user_id = $rep_uuid')
          params.rep_uuid = uuids[0]
        } else {
          orConditions.push('sales_rep_user_id = ANY($rep_uuids)')
          params.rep_uuids = uuids
        }
      }
      
      if (ghlIds.length > 0) {
        if (ghlIds.length === 1) {
          orConditions.push('sales_rep_ghl_id = $rep_ghl')
          params.rep_ghl = ghlIds[0]
        } else {
          orConditions.push('sales_rep_ghl_id = ANY($rep_ghls)')
          params.rep_ghls = ghlIds
        }
      }
      
      if (orConditions.length > 0) {
        conditions.push({
          field: `(${orConditions.join(' OR ')})`,
          operator: '',
          value: '',
          paramName: 'rep_mixed'
        })
      }
    }
  }

  // Setter filter - applied if setterIds provided
  if (filters.setterIds && filters.setterIds.length > 0) {
    if (filters.setterIds.length === 1) {
      const setterId = filters.setterIds[0]
      // Check if it's a UUID or GHL ID based on format
      if (isUUID(setterId)) {
        conditions.push({
          field: 'setter_user_id',
          operator: '=',
          value: setterId,
          paramName: 'setter_id'
        })
        params.setter_id = setterId
      } else {
        // It's a GHL ID, use the ghl_id column
        conditions.push({
          field: 'setter_ghl_id',
          operator: '=',
          value: setterId,
          paramName: 'setter_ghl_id'
        })
        params.setter_ghl_id = setterId
      }
    } else {
      // Multiple IDs - separate UUIDs from GHL IDs
      const uuids = filters.setterIds.filter(id => isUUID(id))
      const ghlIds = filters.setterIds.filter(id => !isUUID(id))
      
      const orConditions: string[] = []
      
      if (uuids.length > 0) {
        if (uuids.length === 1) {
          orConditions.push('setter_user_id = $setter_uuid')
          params.setter_uuid = uuids[0]
        } else {
          orConditions.push('setter_user_id = ANY($setter_uuids)')
          params.setter_uuids = uuids
        }
      }
      
      if (ghlIds.length > 0) {
        if (ghlIds.length === 1) {
          orConditions.push('setter_ghl_id = $setter_ghl')
          params.setter_ghl = ghlIds[0]
        } else {
          orConditions.push('setter_ghl_id = ANY($setter_ghls)')
          params.setter_ghls = ghlIds
        }
      }
      
      if (orConditions.length > 0) {
        conditions.push({
          field: `(${orConditions.join(' OR ')})`,
          operator: '',
          value: '',
          paramName: 'setter_mixed'
        })
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
    } else if (condition.operator === '') {
      // Custom condition (like OR conditions) - field already contains the full condition
      conditions.push(condition.field)
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

/**
 * Check if a string is a valid UUID format
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
} 