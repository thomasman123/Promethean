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
		},
		unit: 'count'
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
		},
		unit: 'count'
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
		},
		unit: 'count'
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
		},
		unit: 'count'
	},
	// Cash Collected: sum over appointments
	'cash_collected': {
		name: 'Cash Collected',
		description: 'Sum of cash collected across appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value']
		},
		unit: 'currency'
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
		},
		unit: 'percent'
	},
	// Pitch to Sale - won / pitched (as fraction)
	'pitch_to_sale_rate': {
		name: 'Pitch to Sale',
		description: 'Ratio of sales (won) to pitched appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN pitched = true THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent'
	},
	// Answer to Sale - won / shows (as fraction)
	'answer_to_sale_rate': {
		name: 'Answer to Sale',
		description: 'Ratio of sales (won) to shown appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent'
	},
	// Cash Collected Per Sale - sum(cash_collected) / count(won)
	'cash_per_sale': {
		name: 'Cash Collected Per Sale',
		description: 'Average cash collected per sale (won appointments)',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF(SUM(CASE WHEN show_outcome = 'won' THEN 1 ELSE 0 END), 0) as value"
			]
		},
		unit: 'currency'
	},
	// Cash Collected Per Appointment - average cash per appointment
	'cash_per_appointment': {
		name: 'Cash Collected Per Appointment',
		description: 'Average cash collected per appointment',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				'COALESCE(AVG(cash_collected), 0) as value'
			]
		},
		unit: 'currency'
	},
	// Cash Per Dial - sum(appointments.cash_collected) / count(dials)
	'cash_per_dial': {
		name: 'Cash Per Dial',
		description: 'Total cash collected divided by count of dials',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF((SELECT COUNT(*) FROM dials WHERE account_id = $account_id AND date_called >= $start_date AND date_called <= $end_date), 0) as value"
			]
		},
		unit: 'currency'
	},
	// Show Up Rate - shows / appointments (as fraction)
	'show_up_rate': {
		name: 'Show Up Rate',
		description: 'Ratio of shown appointments to total appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent'
	},
	// Booking Lead Time - days between appointment creation and scheduled date
	'booking_lead_time': {
		name: 'Booking Lead Time',
		description: 'Days between appointment creation and scheduled date',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (date_booked_for - created_at))/86400), 1), 0) as value"
			]
		},
		unit: 'days'
	},
	// Answers (Dials): count rows where answered = true
	'answers_dials': {
		name: 'Answers (Dials)',
		description: 'Total count of dials marked as answered',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['answered = true']
		},
		unit: 'count'
	},
	// Meaningful Conversations (Dials): count rows where meaningful_conversation = true
	'meaningful_conversations_dials': {
		name: 'Meaningful Conversations (Dials)',
		description: 'Total count of dials with a meaningful conversation',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['meaningful_conversation = true']
		},
		unit: 'count'
	},
	// Booked Calls (Dials): count rows where booked = true
	'booked_calls_dials': {
		name: 'Booked Calls (Dials)',
		description: 'Total count of dials that resulted in a booked call',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COUNT(*) as value'],
			where: ['booked = true']
		},
		unit: 'count'
	},
	// Meaningful Conversation Average Call Length (Dials): AVG(duration) where meaningful_conversation = true
	'meaningful_conversation_avg_call_length_dials': {
		name: 'MC Avg Call Length (Dials)',
		description: 'Average call duration in seconds for dials with meaningful conversations',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COALESCE(AVG(duration), 0) as value'],
			where: ['meaningful_conversation = true']
		},
		unit: 'seconds'
	},
	// Total Dials: count all rows in dials
	'total_dials': {
		name: 'Total Dials',
		description: 'Total count of all dials within the selected filters',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COUNT(*) as value']
		},
		unit: 'count'
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