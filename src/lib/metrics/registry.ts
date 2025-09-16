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
			select: ['COUNT(*) as value']
		},
		unit: 'count' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
	},

	'show_ups': {
		name: 'Show Ups',
		description: 'Appointments with call outcome Show',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'"]
		},
		unit: 'count' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
	},

	'sales_made': {
		name: 'Sales Made',
		description: "Count of appointments where the show's outcome is Won",
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'"]
		},
		unit: 'count' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'percent' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
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
		unit: 'currency' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
	},

	'cash_per_appointment': {
		name: 'Cash Per Appointment',
		description: 'Average cash collected per appointment',
		breakdownType: 'total' as const,
		query: {
			table: 'appointments',
			select: ['COALESCE(AVG(cash_collected), 0) as value']
		},
		unit: 'currency' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			]
		},
		unit: 'currency' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'dialer'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			breakdown: ['total', 'setters']
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
			breakdown: ['total', 'setters']
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
			breakdown: ['total', 'setters']
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
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
	},

	// === DISCOVERY METRICS ===
	'total_discoveries': {
		name: 'Total Discoveries',
		description: 'Total count of all discoveries',
		breakdownType: 'total' as const,
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value']
		},
		unit: 'count' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
		}
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
		unit: 'count' as const,
		options: {
			attribution: ['none', 'assigned', 'booked'],
			breakdown: ['total', 'reps', 'setters', 'link']
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