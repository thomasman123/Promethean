import { MetricDefinition } from './types'
import { createMetricFamilies } from './attribution-generator'

// Define base metrics once - auto-generation creates all attribution variants
const BASE_METRICS = {
	// === APPOINTMENTS METRICS ===
	'total_appointments': {
		name: 'Total Appointments',
		description: 'Total count of all appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value']
		},
		unit: 'count' as const
	},

	'show_ups_appointments': {
		name: 'Show Ups',
		description: 'Appointments with call outcome Show',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'"]
		},
		unit: 'count' as const
	},

	// === DISCOVERIES METRICS ===
	'total_discoveries': {
		name: 'Total Discoveries',
		description: 'Total count of all discoveries',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value']
		},
		unit: 'count' as const
	},

	'show_ups_discoveries': {
		name: 'Discovery Show Ups',
		description: 'Discoveries with call outcome show',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'show'"]
		},
		unit: 'count' as const
	},

	// === SALES METRICS ===
	'sales_made': {
		name: 'Sales Made',
		description: "Count of appointments where the show's outcome is Won",
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'"]
		},
		unit: 'count' as const
	},

	// === CASH METRICS ===
	'cash_collected': {
		name: 'Cash Collected',
		description: 'Sum of cash collected across appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value']
		},
		unit: 'currency' as const
	},

	'cash_per_appointment': {
		name: 'Cash Per Appointment',
		description: 'Average cash collected per appointment',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COALESCE(AVG(cash_collected), 0) as value']
		},
		unit: 'currency' as const
	},

	'cash_per_sale': {
		name: 'Cash Per Sale',
		description: 'Average cash collected per sale (won appointments)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF(SUM(CASE WHEN show_outcome = 'won' THEN 1 ELSE 0 END), 0) as value"
			]
		},
		unit: 'currency' as const
	},

	// === RATE METRICS ===
	'appointment_to_sale_rate': {
		name: 'Appointment to Sale',
		description: 'Ratio of won shows to total appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent' as const
	},

	'pitch_to_sale_rate': {
		name: 'Pitch to Sale',
		description: 'Ratio of sales (won) to pitched appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN pitched = true THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent' as const
	},

	'answer_to_sale_rate': {
		name: 'Answer to Sale',
		description: 'Ratio of sales (won) to shown appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent' as const
	},

	'show_up_rate': {
		name: 'Show Up Rate',
		description: 'Percentage of appointments where contacts showed up',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN LOWER(call_outcome) = 'show' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent' as const
	},

	'show_up_rate_assigned': {
		name: 'Show Up Rate (Assigned)',
		description: 'Percentage of appointments where contacts showed up - attributed to assigned sales rep',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN LOWER(call_outcome) = 'show' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent' as const,
		attributionContext: 'assigned' as const
	},

	'show_up_rate_booked': {
		name: 'Show Up Rate (Booked)',
		description: 'Percentage of appointments where contacts showed up - attributed to setter who booked it',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN LOWER(call_outcome) = 'show' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent' as const,
		attributionContext: 'booked' as const
	},

	// === DIALS METRICS ===
	'total_dials': {
		name: 'Total Dials',
		description: 'Total count of all dials made',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COUNT(*) as value']
		},
		unit: 'count' as const
	},

	'cash_per_dial': {
		name: 'Cash Per Dial',
		description: 'Average cash collected per dial made (cross-table calculation)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['0 as value'] // This will be calculated via cross-table join
		},
		unit: 'currency' as const
	},

	// === META ADS & ROI METRICS ===
	'ad_spend': {
		name: 'Ad Spend',
		description: 'Total amount spent on Meta ads for the period',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['COALESCE(SUM(spend), 0) as value']
		},
		unit: 'currency' as const
	},

	'ad_spend_assigned': {
		name: 'Ad Spend (Assigned)',
		description: 'Total amount spent on Meta ads for the period - attributed to assigned sales rep',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['COALESCE(SUM(spend), 0) as value']
		},
		unit: 'currency' as const,
		attributionContext: 'assigned' as const
	},

	'ad_spend_booked': {
		name: 'Ad Spend (Booked)',
		description: 'Total amount spent on Meta ads for the period - attributed to setter who booked it',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['COALESCE(SUM(spend), 0) as value']
		},
		unit: 'currency' as const,
		attributionContext: 'booked' as const
	},

	'cost_per_booked_call': {
		name: 'Cost Per Booked Call',
		description: 'Total ad spend divided by total appointments for the period',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'currency' as const,
		isSpecialMetric: true
	},

	'cost_per_booked_call_assigned': {
		name: 'Cost Per Booked Call (Assigned)',
		description: 'Total ad spend divided by total appointments for the period - attributed to assigned sales rep',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'currency' as const,
		attributionContext: 'assigned' as const,
		isSpecialMetric: true
	},

	'cost_per_booked_call_booked': {
		name: 'Cost Per Booked Call (Booked)',
		description: 'Total ad spend divided by total appointments for the period - attributed to setter who booked it',
		breakdownType: 'total' as const,
		query: {
			table: 'meta_ad_performance',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'currency' as const,
		attributionContext: 'booked' as const,
		isSpecialMetric: true
	},

	'roi': {
		name: 'ROI',
		description: 'Return on Investment: Cash collected divided by ad spend',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'percent' as const,
		isSpecialMetric: true
	},

	'roi_assigned': {
		name: 'ROI (Assigned)',
		description: 'Return on Investment: Cash collected divided by ad spend - attributed to assigned sales rep',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'percent' as const,
		attributionContext: 'assigned' as const,
		isSpecialMetric: true
	},

	'roi_booked': {
		name: 'ROI (Booked)',
		description: 'Return on Investment: Cash collected divided by ad spend - attributed to setter who booked it',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'percent' as const,
		attributionContext: 'booked' as const,
		isSpecialMetric: true
	},

	// === DIALS CONVERSION METRICS ===
	'dials_per_booking': {
		name: 'Dials per Booking',
		description: 'Percentage of dials that resulted in bookings (booked=true or linked_appointment_id exists)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			]
		},
		unit: 'percent' as const
	},

	'dials_per_booking_assigned': {
		name: 'Dials per Booking (Assigned)',
		description: 'Percentage of dials that resulted in bookings (booked=true or linked_appointment_id exists) - attributed to assigned sales rep',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			]
		},
		unit: 'percent' as const,
		attributionContext: 'assigned' as const
	},

	'dials_per_booking_dialer': {
		name: 'Dials per Booking (Dialer)',
		description: 'Percentage of dials that resulted in bookings (booked=true or linked_appointment_id exists) - attributed to the dialer',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			]
		},
		unit: 'percent' as const,
		attributionContext: 'dialer' as const
	},

	// Rep breakdown variants
	'dials_per_booking_reps': {
		name: 'Dials per Booking (by Rep)',
		description: 'Percentage of dials that resulted in bookings, grouped by sales rep',
		breakdownType: 'rep' as const,
		query: {
			table: 'dials',
			select: [
				'sales_rep_user_id as rep_id',
				'profiles.full_name as rep_name',
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			],
			joins: [
				{
					table: 'profiles',
					on: 'dials.sales_rep_user_id = profiles.id',
					type: 'LEFT'
				}
			],
			groupBy: ['sales_rep_user_id', 'profiles.full_name'],
			having: ['COUNT(*) > 0'],
			orderBy: ['value DESC']
		},
		unit: 'percent' as const
	},

	'dials_per_booking_setters': {
		name: 'Dials per Booking (by Setter)',
		description: 'Percentage of dials that resulted in bookings, grouped by setter',
		breakdownType: 'setter' as const,
		query: {
			table: 'dials',
			select: [
				'setter_user_id as setter_id',
				'profiles.full_name as setter_name',
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			],
			joins: [
				{
					table: 'profiles',
					on: 'dials.setter_user_id = profiles.id',
					type: 'LEFT'
				}
			],
			groupBy: ['setter_user_id', 'profiles.full_name'],
			having: ['COUNT(*) > 0'],
			orderBy: ['value DESC']
		},
		unit: 'percent' as const
	},

	'dials_per_booking_link': {
		name: 'Dials per Booking (Setter→Rep Links)',
		description: 'Percentage of dials that resulted in bookings, showing setter to rep relationships',
		breakdownType: 'link' as const,
		query: {
			table: 'dials',
			select: [
				'setter_user_id as setter_id',
				'setter_profiles.full_name as setter_name',
				'sales_rep_user_id as rep_id',
				'rep_profiles.full_name as rep_name',
				'COALESCE(AVG(CASE WHEN (booked = true OR linked_appointment_id IS NOT NULL) THEN 1.0 ELSE 0.0 END) * 100, 0) as value'
			],
			joins: [
				{
					table: 'profiles setter_profiles',
					on: 'dials.setter_user_id = setter_profiles.id',
					type: 'LEFT'
				},
				{
					table: 'profiles rep_profiles',
					on: 'dials.sales_rep_user_id = rep_profiles.id',
					type: 'LEFT'
				}
			],
			groupBy: ['setter_user_id', 'setter_profiles.full_name', 'sales_rep_user_id', 'rep_profiles.full_name'],
			having: ['COUNT(*) > 0'],
			orderBy: ['value DESC']
		},
		unit: 'percent' as const
	},

	// === SPEED TO LEAD METRIC ===
	'speed_to_lead': {
		name: 'Speed to Lead',
		description: 'Average time from contact creation to first dial (in seconds)',
		breakdownType: 'total' as const,
		query: {
			table: 'contacts',
			select: ['0 as value'] // This will be calculated via special SQL in engine
		},
		unit: 'seconds' as const,
		isSpecialMetric: true // Flag to indicate this uses custom SQL in the engine
	}
}

// Auto-generate all attribution variants
// This creates: base_metric, base_metric_assigned, base_metric_booked, base_metric_dialer
export const METRICS_REGISTRY: Record<string, MetricDefinition> = createMetricFamilies(BASE_METRICS)

// Helper function to get a metric by name with fallback
export function getMetric(metricName: string): MetricDefinition | undefined {
  return METRICS_REGISTRY[metricName]
}

// Helper function to get all metrics for a specific attribution context
export function getMetricsByAttribution(context: 'assigned' | 'booked' | 'dialer'): Array<{ name: string; metric: MetricDefinition }> {
  return Object.entries(METRICS_REGISTRY)
    .filter(([_, metric]) => metric.attributionContext === context)
    .map(([name, metric]) => ({ name, metric }))
}

// Helper function to get legacy metrics (no attribution context)
export function getLegacyMetrics(): Array<{ name: string; metric: MetricDefinition }> {
  return Object.entries(METRICS_REGISTRY)
    .filter(([_, metric]) => !metric.attributionContext)
    .map(([name, metric]) => ({ name, metric }))
}

// Development helper: log generated metrics (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log(`🎯 Auto-generated ${Object.keys(METRICS_REGISTRY).length} metrics from ${Object.keys(BASE_METRICS).length} base definitions`)
}

// Legacy helper functions (kept for compatibility)
export function getAllMetricNames(): string[] {
	return Object.keys(METRICS_REGISTRY)
}

export function getMetricsByBreakdownType(type: string) {
	return Object.entries(METRICS_REGISTRY)
		.filter(([_, metric]) => metric.breakdownType === type)
		.map(([metricName, metric]) => ({ metricName, ...metric }))
} 