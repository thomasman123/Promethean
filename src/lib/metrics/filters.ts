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

function toDateOnlyString(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

/**
 * Applies standard filters to any metric query
 * Returns SQL conditions and parameters for safe execution
 */
export function applyStandardFilters(filters: MetricFilters, baseTable: string): AppliedFilters {
	const conditions: FilterCondition[] = []
	const params: Record<string, any> = {}

	// Choose date field based on base table
	const dateField = baseTable === 'dials' ? 'date_called' : 'date_booked_for'

	// Normalize start/end strings and compute exclusive end bound (next day)
	const startStr = filters.dateRange.start
	const endStr = filters.dateRange.end
	const endExclusive = (() => {
		try {
			const d = new Date(`${endStr}T00:00:00`)
			d.setDate(d.getDate() + 1)
			return toDateOnlyString(d)
		} catch {
			return endStr
		}
	})()

	// Date range filter - start inclusive
	conditions.push({
		field: dateField,
		operator: '>=',
		value: startStr,
		paramName: 'start_date'
	})
	
	// Date range filter - end exclusive (next-day)
	conditions.push({
		field: dateField,
		operator: '<',
		value: endExclusive,
		paramName: 'end_plus'
	})
	
	params.start_date = startStr
	// Keep original end_date for time-series generation bounds; also provide exclusive params for filtering
	params.range_end = endStr
	params.end_plus = endExclusive

	// Account filter - always applied
	conditions.push({
		field: 'account_id',
		operator: '=',
		value: filters.accountId,
		paramName: 'account_id'
	})
	params.account_id = filters.accountId

	// Determine rep/setter fields based on table
	const repField = baseTable === 'appointments' ? 'sales_rep_user_id' : null
	const setterField = baseTable === 'appointments' ? 'setter_user_id' : null

	// Rep filter - applied if repIds provided AND field available on table
	if (repField && filters.repIds && filters.repIds.length > 0) {
		if (filters.repIds.length === 1) {
			conditions.push({
				field: repField,
				operator: '=',
				value: filters.repIds[0],
				paramName: 'rep_user_id'
			})
			params.rep_user_id = filters.repIds[0]
		} else {
			conditions.push({
				field: repField,
				operator: 'IN',
				value: filters.repIds,
				paramName: 'rep_user_ids'
			})
			params.rep_user_ids = filters.repIds
		}
	}

	// Setter filter - applied if setterIds provided AND field available on table
	if (setterField && filters.setterIds && filters.setterIds.length > 0) {
		if (filters.setterIds.length === 1) {
			conditions.push({
				field: setterField,
				operator: '=',
				value: filters.setterIds[0],
				paramName: 'setter_user_id'
			})
			params.setter_user_id = filters.setterIds[0]
		} else {
			conditions.push({
				field: setterField,
				operator: 'IN',
				value: filters.setterIds,
				paramName: 'setter_user_ids'
			})
			params.setter_user_ids = filters.setterIds
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