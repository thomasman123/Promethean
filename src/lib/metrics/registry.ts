import { MetricDefinition } from './types'

// Central registry of all metrics
export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
  'total_appointments_reps': {
    name: 'Total Appointments (Reps)',
    description: 'Count of all appointments grouped by sales rep',
    breakdownType: 'rep',
    query: {
      table: 'appointments',
      select: [
        'sales_rep_user_id as rep_id',
        'COUNT(*) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.sales_rep_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: ['sales_rep_user_id', 'profiles.full_name'],
      orderBy: ['value DESC']
    }
  },

  'total_appointments_setters': {
    name: 'Total Appointments (Setters)',
    description: 'Count of all appointments grouped by setter',
    breakdownType: 'setter',
    query: {
      table: 'appointments',
      select: [
        'setter_user_id as setter_id',
        'COUNT(*) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.setter_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: ['setter_user_id', 'profiles.full_name'],
      orderBy: ['value DESC']
    }
  },

  'total_appointments': {
    name: 'Total Appointments',
    description: 'Total count of all appointments',
    breakdownType: 'total',
    query: {
      table: 'appointments',
      select: ['COUNT(*) as value']
    }
  },

  'appointments_link': {
    name: 'Appointments (Setter → Rep Link)',
    description: 'Appointments showing the link between setters and reps',
    breakdownType: 'link',
    query: {
      table: 'appointments',
      select: [
        'setter_user_id as setter_id',
        'sales_rep_user_id as rep_id',
        'COUNT(*) as value'
      ],
      joins: [
        {
          table: 'profiles as setter_profiles',
          on: 'appointments.setter_user_id = setter_profiles.id',
          type: 'LEFT'
        },
        {
          table: 'profiles as rep_profiles',
          on: 'appointments.sales_rep_user_id = rep_profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: [
        'setter_user_id', 
        'sales_rep_user_id',
        'setter_profiles.full_name',
        'rep_profiles.full_name'
      ],
      orderBy: ['value DESC']
    }
  },

  'show_rate_reps': {
    name: 'Show Rate (Reps)',
    description: 'Percentage of appointments that resulted in shows, grouped by rep',
    breakdownType: 'rep',
    query: {
      table: 'appointments',
      select: [
        'sales_rep_user_id as rep_id',
        'ROUND((COUNT(CASE WHEN call_outcome = \'Show\' THEN 1 END) * 100.0 / COUNT(*)), 2) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.sales_rep_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: ['sales_rep_user_id', 'profiles.full_name'],
      having: ['COUNT(*) > 0'], // Only include reps with appointments
      orderBy: ['value DESC']
    }
  },

  'close_rate_reps': {
    name: 'Close Rate (Reps)',
    description: 'Percentage of shows that resulted in wins, grouped by rep',
    breakdownType: 'rep',
    query: {
      table: 'appointments',
      select: [
        'sales_rep_user_id as rep_id',
        'ROUND((COUNT(CASE WHEN show_outcome = \'won\' THEN 1 END) * 100.0 / COUNT(CASE WHEN call_outcome = \'Show\' THEN 1 END)), 2) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.sales_rep_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      where: ['call_outcome = \'Show\''], // Only shows count for close rate
      groupBy: ['sales_rep_user_id', 'profiles.full_name'],
      having: ['COUNT(*) > 0'], // Only include reps with shows
      orderBy: ['value DESC']
    }
  },

  'total_revenue_reps': {
    name: 'Total Revenue (Reps)',
    description: 'Sum of cash collected grouped by rep',
    breakdownType: 'rep',
    query: {
      table: 'appointments',
      select: [
        'sales_rep_user_id as rep_id',
        'COALESCE(SUM(cash_collected), 0) as value'
      ],
      joins: [
        {
          table: 'profiles',
          on: 'appointments.sales_rep_user_id = profiles.id',
          type: 'LEFT'
        }
      ],
      groupBy: ['sales_rep_user_id', 'profiles.full_name'],
      orderBy: ['value DESC']
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