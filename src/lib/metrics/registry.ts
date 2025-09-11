import { MetricDefinition } from './types'

// Central registry of all metrics with clear attribution context
export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
	// === APPOINTMENTS METRICS ===
	// Clear separation: Assigned (sales_rep_user_id) vs Booked (setter_user_id)
	'total_appointments_assigned': {
		name: 'Total Appointments (Assigned)',
		description: 'Appointments assigned to sales reps (sales_rep_user_id)',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value']
		},
		unit: 'count',
		attributionContext: 'assigned' // Uses sales_rep_user_id
	},
	'total_appointments_booked': {
		name: 'Total Appointments (Booked)',
		description: 'Appointments booked by setters (setter_user_id)',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value']
		},
		unit: 'count',
		attributionContext: 'booked' // Uses setter_user_id
	},
	
	// Legacy combined metric (deprecated but kept for compatibility)
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

	// Show Ups with clear attribution
	'show_ups_appointments_assigned': {
		name: 'Show Ups (Assigned)',
		description: 'Show ups for appointments assigned to sales reps',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'"]
		},
		unit: 'count',
		attributionContext: 'assigned'
	},
	'show_ups_appointments_booked': {
		name: 'Show Ups (Booked)',
		description: 'Show ups for appointments booked by setters',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'"]
		},
		unit: 'count',
		attributionContext: 'booked'
	},

	// Legacy show ups (deprecated)
	'show_ups_appointments': {
		name: 'Show Ups (Appointments)',
		description: 'Total count of appointments with call outcome Show',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["LOWER(call_outcome) = 'show'"]
		},
		unit: 'count'
	},

	// === DISCOVERIES METRICS ===
	// Assigned = setter_user_id (person assigned to discovery)
	// Booked = sales_rep_user_id (sales rep it was booked for)
	'total_discoveries_assigned': {
		name: 'Total Discoveries (Assigned)',
		description: 'Discoveries assigned to users (setter_user_id)',
		breakdownType: 'total',
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value']
		},
		unit: 'count',
		attributionContext: 'assigned' // Uses setter_user_id for discoveries
	},
	'total_discoveries_booked': {
		name: 'Total Discoveries (Booked For)',
		description: 'Discoveries booked for sales reps (sales_rep_user_id)',
		breakdownType: 'total',
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value']
		},
		unit: 'count',
		attributionContext: 'booked' // Uses sales_rep_user_id for discoveries
	},

	// Show Ups (Discoveries) with attribution
	'show_ups_discoveries_assigned': {
		name: 'Discovery Show Ups (Assigned)',
		description: 'Show ups for discoveries assigned to users',
		breakdownType: 'total',
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'show'"]
		},
		unit: 'count',
		attributionContext: 'assigned'
	},
	'show_ups_discoveries_booked': {
		name: 'Discovery Show Ups (Booked For)',
		description: 'Show ups for discoveries booked for sales reps',
		breakdownType: 'total',
		query: {
			table: 'discoveries',
			select: ['COUNT(*) as value'],
			where: ["call_outcome = 'show'"]
		},
		unit: 'count',
		attributionContext: 'booked'
	},

	// Legacy discoveries (deprecated)
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

	// === DIALS METRICS ===
	// Dials only have setter_user_id (person who made the dial)
	'total_dials': {
		name: 'Total Dials',
		description: 'Total count of all dials made',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: ['COUNT(*) as value']
		},
		unit: 'count',
		attributionContext: 'dialer' // Uses setter_user_id only
	},

	// === SALES METRICS ===
	// Sales attribution: who gets credit for the sale?
	'sales_made_assigned': {
		name: 'Sales Made (Assigned)',
		description: "Sales made by assigned sales reps",
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'"]
		},
		unit: 'count',
		attributionContext: 'assigned'
	},
	'sales_made_booked': {
		name: 'Sales Made (Booked)',
		description: "Sales made from appointments booked by setters",
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COUNT(*) as value'],
			where: ["show_outcome = 'won'"]
		},
		unit: 'count',
		attributionContext: 'booked'
	},

	// Legacy sales (deprecated)
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

	// === CASH METRICS ===
	// Cash attribution with clear context
	'cash_collected_assigned': {
		name: 'Cash Collected (Assigned)',
		description: 'Cash collected by assigned sales reps',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value']
		},
		unit: 'currency',
		attributionContext: 'assigned'
	},
	'cash_collected_booked': {
		name: 'Cash Collected (Booked)',
		description: 'Cash collected from appointments booked by setters',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(SUM(cash_collected), 0) as value']
		},
		unit: 'currency',
		attributionContext: 'booked'
	},

	// Legacy cash collected (deprecated)
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

	// Cash per appointment with attribution
	'cash_per_appointment_assigned': {
		name: 'Cash Per Appointment (Assigned)',
		description: 'Average cash collected per assigned appointment',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(AVG(cash_collected), 0) as value']
		},
		unit: 'currency',
		attributionContext: 'assigned'
	},
	'cash_per_appointment_booked': {
		name: 'Cash Per Appointment (Booked)',
		description: 'Average cash collected per booked appointment',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: ['COALESCE(AVG(cash_collected), 0) as value']
		},
		unit: 'currency',
		attributionContext: 'booked'
	},

	// Legacy cash per appointment (deprecated)
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

	// === RATE METRICS ===
	// Appointment to sale rates with attribution
	'appointment_to_sale_rate_assigned': {
		name: 'Appointment to Sale (Assigned)',
		description: 'Ratio of won shows to total assigned appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'assigned'
	},
	'appointment_to_sale_rate_booked': {
		name: 'Appointment to Sale (Booked)',
		description: 'Ratio of won shows to total booked appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'booked'
	},

	// Legacy rates (deprecated)
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
	'pitch_to_sale_rate_assigned': {
		name: 'Pitch to Sale (Assigned)',
		description: 'Ratio of sales (won) to pitched appointments by assigned sales reps',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN pitched = true THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'assigned'
	},
	'pitch_to_sale_rate_booked': {
		name: 'Pitch to Sale (Booked)',
		description: 'Ratio of sales (won) to pitched appointments from booked appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN pitched = true THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'booked'
	},

	// Legacy pitch to sale (deprecated)
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
	'answer_to_sale_rate_assigned': {
		name: 'Answer to Sale (Assigned)',
		description: 'Ratio of sales (won) to shown appointments by assigned sales reps',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'assigned'
	},
	'answer_to_sale_rate_booked': {
		name: 'Answer to Sale (Booked)',
		description: 'Ratio of sales (won) to shown appointments from booked appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(AVG(CASE WHEN call_outcome = 'Show' THEN CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END END), 0) as value"
			]
		},
		unit: 'percent',
		attributionContext: 'booked'
	},

	// Legacy answer to sale (deprecated)
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
	'cash_per_sale_assigned': {
		name: 'Cash Per Sale (Assigned)',
		description: 'Average cash collected per sale by assigned sales reps',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF(SUM(CASE WHEN show_outcome = 'won' THEN 1 ELSE 0 END), 0) as value"
			]
		},
		unit: 'currency',
		attributionContext: 'assigned'
	},
	'cash_per_sale_booked': {
		name: 'Cash Per Sale (Booked)',
		description: 'Average cash collected per sale from booked appointments',
		breakdownType: 'total',
		query: {
			table: 'appointments',
			select: [
				"COALESCE(SUM(cash_collected), 0) / NULLIF(SUM(CASE WHEN show_outcome = 'won' THEN 1 ELSE 0 END), 0) as value"
			]
		},
		unit: 'currency',
		attributionContext: 'booked'
	},

	// Legacy cash per sale (deprecated)
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

	// Cash Per Dial - sum(appointments.cash_collected) / count(dials)
	// Note: This is a complex cross-table metric that needs special handling
	'cash_per_dial': {
		name: 'Cash Collected Per Dial',
		description: 'Average cash collected per dial made (cross-table calculation)',
		breakdownType: 'total',
		query: {
			table: 'dials',
			select: [
				'0 as value' // This will be calculated via cross-table join
			]
		},
		unit: 'currency',
		attributionContext: 'dialer' // Dials are attributed to the dialer
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