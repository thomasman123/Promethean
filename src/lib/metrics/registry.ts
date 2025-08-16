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