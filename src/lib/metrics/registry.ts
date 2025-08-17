import { MetricDefinition } from './types'

// Central registry of all metrics (pruned to a single baseline metric)
export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
	'total_appointments': {
		name: 'Total Appointments',
		description: 'Total count of all appointments within the selected filters',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value']
		}
	},
	// Show Ups (Appointments): count rows where call_outcome is 'Show'
	'show_ups_appointments': {
		name: 'Show Ups (Appointments)',
		description: 'Total count of appointments with call outcome Show',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'Show'"]
		}
	},
	// Show Ups (Discoveries): count rows where call_outcome is 'show'
	'show_ups_discoveries': {
		name: 'Show Ups (Discoveries)',
		description: 'Total count of discoveries with call outcome show',
		breakdownType: 'total',
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'show'"]
		}
	},
	// Sales Made: appointments with show_outcome = 'won'
	'sales_made': {
		name: 'Sales Made',
		description: "Count of appointments where the show's outcome is Won",
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'"]
		}
	},
	// Cash Collected: sum over appointments
	'cash_collected': {
		name: 'Cash Collected',
		description: 'Sum of cash collected across appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value']
		}
	},
	// Appointment to Sale rate: won count / total count within filters
	'appointment_to_sale_rate': {
		name: 'Appointment to Sale',
		description: 'Ratio of won shows to total appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		}
	}
}

// Helper function to get a metric by name
export function getMetric(name: string): MetricDefinition | null {
	return METRICS_REGISTRY[name] || null
}

// Helper function to get all metric names
export function getAllMetricNames(): string[] {
	return Object.keys(METRICS_REGISTRY)
}

// Helper function to get metrics by breakdown type
export function getMetricsByBreakdownType(type: string) {
	return Object.entries(METRICS_REGISTRY)
		.filter(([_, metric]) => metric.breakdownType === type)
		.map(([metricName, metric]) => ({ metricName, ...metric }))
} 