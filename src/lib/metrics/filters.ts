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

function pickLocalDateColumn(baseTable: string, startStr: string, endStr: string): 'local_date' | 'local_week' | 'local_month' {
	const start = new Date(startStr)
	const end = new Date(endStr)
	const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
	
	// For single month periods (like Sep 1-30), use monthly aggregation
	if (diffDays >= 28 && diffDays <= 31) return 'local_month'
	// For longer periods, use monthly aggregation
	if (diffDays >= 60) return 'local_month'
	// For 2+ weeks, use weekly aggregation
	if (diffDays >= 14) return 'local_week'
	// For short periods, use daily aggregation
	return 'local_date'
}

/**
 * Applies standard filters to any metric query
 * Returns SQL conditions and parameters for safe execution
 */
export function applyStandardFilters(filters: MetricFilters, baseTable: string): AppliedFilters {
	const conditions: FilterCondition[] = []
	const params: Record<string, any> = {}

	// Determine appropriate local date column for filtering
	const startStr = filters.dateRange.start
	const endStr = filters.dateRange.end
	
	// IMPORTANT: Always use local_date for filtering (day-level precision)
	// Weekly/monthly columns are only for grouping in time series charts, not filtering
	let dateCol: string
	if (baseTable === 'contacts') {
		// Contacts table uses GHL local date columns for accurate lead tracking
		dateCol = 'ghl_local_date' // Always use daily precision for filtering
	} else {
		// Other tables use local_date for filtering
		dateCol = 'local_date' // Always use daily precision for filtering
	}

	// Compute exclusive end date (next day) for date range filters
	const endExclusive = (() => {
		try { const d = new Date(`${endStr}T00:00:00`); d.setDate(d.getDate() + 1); return toDateOnlyString(d) } catch { return endStr }
	})()

	// Date range filtering - use local date columns for all tables now
	conditions.push({ field: dateCol, operator: '>=', value: startStr, paramName: 'start_date' })
	conditions.push({ field: dateCol, operator: '<', value: endExclusive, paramName: 'end_plus' })
	params.start_date = startStr
	params.end_plus = endExclusive
	params.range_end = endStr

	// Account filter - always applied
	conditions.push({ field: 'account_id', operator: '=', value: filters.accountId, paramName: 'account_id' })
	params.account_id = filters.accountId

	// Rep/Setter filters - check which tables have these columns
	const repField = (baseTable === 'appointments' || baseTable === 'discoveries') ? 'sales_rep_user_id' : null
	const setterField = (baseTable === 'appointments' || baseTable === 'discoveries' || baseTable === 'dials') ? 'setter_user_id' : null

	if (repField && filters.repIds && filters.repIds.length > 0) {
		if (filters.repIds.length === 1) {
			conditions.push({ field: repField, operator: '=', value: filters.repIds[0], paramName: 'rep_user_id' })
			params.rep_user_id = filters.repIds[0]
		} else {
			conditions.push({ field: repField, operator: 'IN', value: filters.repIds, paramName: 'rep_user_ids' })
			params.rep_user_ids = filters.repIds
		}
	}

	if (setterField && filters.setterIds && filters.setterIds.length > 0) {
		if (filters.setterIds.length === 1) {
			conditions.push({ field: setterField, operator: '=', value: filters.setterIds[0], paramName: 'setter_user_id' })
			params.setter_user_id = filters.setterIds[0]
		} else {
			conditions.push({ field: setterField, operator: 'IN', value: filters.setterIds, paramName: 'setter_user_ids' })
			params.setter_user_ids = filters.setterIds
		}
	}

	// Advanced UTM/attribution filters (arrays become IN clauses)
	const arrayFields: Array<{ key: keyof MetricFilters; column: string; param: string }> = [
		{ key: 'utm_source', column: 'utm_source', param: 'utm_source' },
		{ key: 'utm_medium', column: 'utm_medium', param: 'utm_medium' },
		{ key: 'utm_campaign', column: 'utm_campaign', param: 'utm_campaign' },
		{ key: 'utm_content', column: 'utm_content', param: 'utm_content' },
		{ key: 'utm_term', column: 'utm_term', param: 'utm_term' },
		{ key: 'utm_id', column: 'utm_id', param: 'utm_id' },
		// Use JSON-based fields to be consistent across tables
		{ key: 'source_category', column: "(last_attribution_source->>'source_category')", param: 'source_category' },
		{ key: 'specific_source', column: "(last_attribution_source->>'specific_source')", param: 'specific_source' },
		{ key: 'session_source', column: 'session_source', param: 'session_source' },
		{ key: 'referrer', column: 'contact_referrer', param: 'referrer' },
		{ key: 'fbclid', column: 'fbclid', param: 'fbclid' },
		{ key: 'fbc', column: 'fbc', param: 'fbc' },
		{ key: 'fbp', column: 'fbp', param: 'fbp' },
		{ key: 'gclid', column: 'contact_gclid', param: 'gclid' },
	]

	for (const field of arrayFields) {
		const values = filters[field.key] as string[] | undefined
		if (values && values.length > 0) {
			if (values.length === 1) {
				conditions.push({ field: field.column, operator: '=', value: values[0], paramName: field.param })
				params[field.param] = values[0]
			} else {
				conditions.push({ field: field.column, operator: 'IN', value: values, paramName: `${field.param}_arr` })
				params[`${field.param}_arr`] = values
			}
		}
	}

	return { conditions, params }
}

export function buildWhereClause(appliedFilters: AppliedFilters, additionalWhere?: string[]): string {
	const conditions: string[] = []
	for (const condition of appliedFilters.conditions) {
		if (condition.operator === 'IN') {
			const placeholders = condition.value.map((_: any, index: number) => `$${condition.paramName}_${index}`).join(', ')
			conditions.push(`${condition.field} IN (${placeholders})`)
		} else {
			conditions.push(`${condition.field} ${condition.operator} $${condition.paramName}`)
		}
	}
	if (additionalWhere && additionalWhere.length > 0) conditions.push(...additionalWhere)
	return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

export function flattenParams(appliedFilters: AppliedFilters): Record<string, any> {
	const flat: Record<string, any> = {}
	for (const [key, value] of Object.entries(appliedFilters.params)) {
		if (Array.isArray(value)) value.forEach((item, idx) => { flat[`${key}_${idx}`] = item })
		else flat[key] = value
	}
	return flat
}

export function validateFilters(filters: MetricFilters): { valid: boolean; errors: string[] } {
	const errors: string[] = []
	if (!filters.dateRange.start) errors.push('Start date is required')
	if (!filters.dateRange.end) errors.push('End date is required')
	if (!filters.accountId) errors.push('Account ID is required')
	try { new Date(filters.dateRange.start); new Date(filters.dateRange.end) } catch { errors.push('Invalid date format') }
	if (new Date(filters.dateRange.start) > new Date(filters.dateRange.end)) errors.push('Start date must be before end date')
	return { valid: errors.length === 0, errors }
} 