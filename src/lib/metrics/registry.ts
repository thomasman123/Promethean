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