import { MetricDefinition } from './types'
import { createMetricFamilies } from './attribution-generator'

// Define consolidated base metrics - variants are handled via options
const BASE_METRICS = {
	// === APPOINTMENTS METRICS ===
	'total_appointments': {
		name: 'Total Appointments',
		description: 'Total count of all appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ['data_filled = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'show_ups': {
		name: 'Show Ups',
		description: 'Appointments with call outcome Show',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'", "data_filled = true"]
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'sales_made': {
		name: 'Sales Made',
		description: "Count of appointments where the show's outcome is Won",
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'", "data_filled = true"]
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'show_up_rate': {
		name: 'Show Up Rate',
		description: 'Percentage of appointments where contacts showed up',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN LOWER(call_outcome) = 'show' THEN 1.0 ELSE 0.0 END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	// === SALES METRICS ===
	'appointment_to_sale_rate': {
		name: 'Appointment to Sale',
		description: 'Ratio of won shows to total appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'pitch_to_sale_rate': {
		name: 'Pitch to Sale',
		description: 'Ratio of sales (won) to pitched appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN pitched = true THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'answer_to_sale_rate': {
		name: 'Answer to Sale',
		description: 'Ratio of sales (won) to shown appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'booking_to_close': {
		name: 'Booking to Close',
		description: 'Percentage of appointments that converted to sales (won outcomes)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	// === CASH METRICS ===
	'cash_collected': {
		name: 'Cash Collected',
		description: 'Sum of cash collected across appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value'],
			where: ['data_filled = true']
		},
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'cash_per_appointment': {
		name: 'Cash Per Appointment',
		description: 'Average cash collected per appointment',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COALESCE(AVG(cash_collected), 0) as value'],
			where: ['data_filled = true']
		},
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'cash_per_sale': {
		name: 'Cash Per Sale',
		description: 'Average cash collected per sale (won appointments)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF(SUM(CASE WHEN show_outcome = 'won' THEN 1 ELSE 0 END), 0) as value"
			],
			where: ['data_filled = true']
		},
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
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
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'answers': {
		name: 'Answers',
		description: 'Total count of dials that were answered',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['answered = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'meaningful_conversations': {
		name: 'Meaningful Conversations',
		description: 'Total count of dials with meaningful conversations (duration >= 120 seconds)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['meaningful_conversation = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'booked_calls': {
		name: 'Booked Calls',
		description: 'Total count of dials that resulted in bookings',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['booked = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'meaningful_conversation_avg_call_length': {
		name: 'Meaningful Conversation Avg Call Length',
		description: 'Average duration of meaningful conversations (duration >= 120 seconds)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COALESCE(AVG(duration), 0) as value'],
			where: ['meaningful_conversation = true']
		},
		unit: 'seconds' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
			timeFormat: ['seconds', 'minutes', 'hours', 'human_readable']
		}
	},

	'answer_to_conversation_ratio': {
		name: 'Answer to Conversation Ratio',
		description: 'Percentage of answered calls that became meaningful conversations',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'CASE WHEN COUNT(*) FILTER (WHERE answered = true) > 0 THEN COALESCE(COUNT(*) FILTER (WHERE meaningful_conversation = true)::DECIMAL / COUNT(*) FILTER (WHERE answered = true), 0) ELSE 0 END as value'
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'meaningful_conversation_to_booking_ratio': {
		name: 'Meaningful Conversation to Booking Ratio',
		description: 'Percentage of meaningful conversations that resulted in bookings',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'CASE WHEN COUNT(*) FILTER (WHERE meaningful_conversation = true) > 0 THEN COALESCE(COUNT(*) FILTER (WHERE booked = true AND meaningful_conversation = true)::DECIMAL / COUNT(*) FILTER (WHERE meaningful_conversation = true), 0) ELSE 0 END as value'
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	// === PAYMENT METRICS ===
	'pif_rate': {
		name: 'PIF Rate',
		description: 'Percentage of won appointments that were paid in full (cash_collected = total_sales_value)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				"CASE WHEN COUNT(*) FILTER (WHERE show_outcome = 'won') > 0 THEN COALESCE(COUNT(*) FILTER (WHERE pif = true AND show_outcome = 'won')::DECIMAL / COUNT(*) FILTER (WHERE show_outcome = 'won'), 0) ELSE 0 END as value"
			],
			where: ['data_filled = true']
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'cash_collection_rate': {
		name: 'Cash Collection Rate',
		description: 'Percentage of total sales value that was actually collected (cash_collected / total_sales_value)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				'CASE WHEN SUM(total_sales_value) > 0 THEN COALESCE(SUM(cash_collected)::DECIMAL / SUM(total_sales_value), 0) ELSE 0 END as value'
			],
			where: ["show_outcome = 'won'", "total_sales_value > 0", "data_filled = true"]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'average_contract_value_per_sale': {
		name: 'Average Contract Value per Sale',
		description: 'Average total sales value for won appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				'COALESCE(AVG(total_sales_value), 0) as value'
			],
			where: ["show_outcome = 'won'", "total_sales_value > 0", "data_filled = true"]
		},
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'total_revenue_generated': {
		name: 'Total Revenue Generated',
		description: 'Total sales value from all won appointments (contracts signed)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				'COALESCE(SUM(total_sales_value), 0) as value'
			],
			where: ["show_outcome = 'won'", "total_sales_value > 0", "data_filled = true"]
		},
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	// === QUALITY METRICS ===
	'lead_quality': {
		name: 'Lead Quality (1-5)',
		description: 'Average lead quality score from appointments (1-5 scale)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: [
				'COALESCE(AVG(lead_quality), 0) as value'
			],
			where: ['lead_quality IS NOT NULL', 'data_filled = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'discovery_lead_quality': {
		name: 'Discovery Lead Quality (1-5)',
		description: 'Average lead quality score from discoveries (1-5 scale)',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: [
				'COALESCE(AVG(lead_quality), 0) as value'
			],
			where: ['lead_quality IS NOT NULL', 'data_filled = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	// === LEADS METRICS ===
	'total_leads': {
		name: 'Total Leads',
		description: 'Total count of unique contacts/leads created in GoHighLevel for the selected date range',
		breakdownType: 'total' as const,
		query: {
			table: 'contacts',
			select: ['COUNT(*) as value'],
			where: ['ghl_created_at IS NOT NULL'] // Only count contacts with GHL creation date
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'lead_to_appointment': {
		name: 'Lead to Appointment',
		description: 'Percentage of leads that convert to appointments',
		breakdownType: 'total' as const,
		query: {
			table: 'contacts',
			select: ['0 as value'] // This will be calculated via cross-table calculation in engine
		},
		unit: 'percent' as const,
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'answer_per_dial': {
		name: 'Answer per Dial',
		description: 'Percentage of dials that were answered',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				"COALESCE(AVG(CASE WHEN answered = true THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'dials_per_booking': {
		name: 'Dials per Booking',
		description: 'Average number of dials needed to get one booking (total dials / bookings)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: [
				'CASE WHEN SUM(CASE WHEN (booked = true OR booked_appointment_id IS NOT NULL) THEN 1 ELSE 0 END) > 0 THEN ROUND(COUNT(*)::DECIMAL / SUM(CASE WHEN (booked = true OR booked_appointment_id IS NOT NULL) THEN 1 ELSE 0 END), 1) ELSE 0 END as value'
			]
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'cash_per_dial': {
		name: 'Cash Per Dial',
		description: 'Average cash collected per dial made (cross-table calculation)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['0 as value'] // This will be calculated via cross-table join
		},
		unit: 'currency' as const,
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
		}
	},

	'total_talk_time': {
		name: 'Total Talk Time',
		description: 'Total duration of all dials (sum of duration in human readable format)',
		breakdownType: 'total' as const,
		query: {
			table: 'dials',
			select: ['COALESCE(SUM(duration), 0) as value']
		},
		unit: 'seconds' as const,
		options: {
			attribution: ['all', 'assigned', 'dialer'],
			timeFormat: ['human_readable', 'seconds', 'minutes', 'hours']
		}
	},

	// === PERFORMANCE METRICS ===
	'bookings_per_hour': {
		name: 'Bookings per Hour',
		description: 'Average bookings per work hour (calculated from dials data)',
		breakdownType: 'total' as const,
		query: {
			table: 'work_timeframes',
			select: ['0 as value'] // This will be calculated on-demand in UserMetricsEngine
		},
		unit: 'count' as const,
		isSpecialMetric: true,
		options: {
		}
	},

	'dials_per_hour': {
		name: 'Dials per Hour',
		description: 'Average dials per work hour (calculated from dials data)',
		breakdownType: 'total' as const,
		query: {
			table: 'work_timeframes',
			select: ['0 as value'] // This will be calculated on-demand in UserMetricsEngine
		},
		unit: 'count' as const,
		isSpecialMetric: true,
		options: {
		}
	},

	'hours_worked': {
		name: 'Hours Worked',
		description: 'Total work hours (from first dial to last dial each day)',
		breakdownType: 'total' as const,
		query: {
			table: 'work_timeframes',
			select: ['0 as value'] // This will be calculated on-demand in UserMetricsEngine
		},
		unit: 'count' as const,
		isSpecialMetric: true,
		options: {
		}
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
		unit: 'currency' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
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
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
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
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	// === DISCOVERY METRICS ===
	'total_discoveries': {
		name: 'Total Discoveries',
		description: 'Total count of all discoveries',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ['data_filled = true']
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'show_ups_discoveries': {
		name: 'Discovery Show Ups',
		description: 'Discoveries with call outcome show',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'show'", "data_filled = true"]
		},
		unit: 'count' as const,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
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
		isSpecialMetric: true,
		options: {
			calculation: ['average', 'median'],
			businessHours: ['include', 'exclude']
		}
	},

	// === DATA COMPLETION METRICS ===
	'data_completion_rate': {
		name: 'Data Completion Rate',
		description: 'Percentage of appointments and discoveries that have completed data entry (data_filled = true)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments', // Will be handled specially to include both appointments and discoveries
			select: ['0 as value'] // This will be calculated via special SQL in engine
		},
		unit: 'percent' as const,
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'overdue_items': {
		name: 'Overdue Items',
		description: 'Count of appointments and discoveries that are overdue (24+ hours past date_booked_for without data entry)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments', // Will be handled specially to include both appointments and discoveries
			select: ['0 as value'] // This will be calculated via special SQL in engine
		},
		unit: 'count' as const,
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
	},

	'overdue_percentage': {
		name: 'Overdue Percentage',
		description: 'Percentage of appointments and discoveries that are overdue (24+ hours past date_booked_for without data entry)',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments', // Will be handled specially to include both appointments and discoveries
			select: ['0 as value'] // This will be calculated via special SQL in engine
		},
		unit: 'percent' as const,
		isSpecialMetric: true,
		options: {
			attribution: ['all', 'assigned', 'booked'],
		}
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