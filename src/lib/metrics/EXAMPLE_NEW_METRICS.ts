/**
 * EXAMPLE: How to Add New Metrics with Auto-Generation
 * 
 * This file demonstrates how easy it is to add new metrics using the 
 * attribution auto-generation system. Just define the base metric once,
 * and all attribution variants are created automatically!
 */

import { createMetricFamily } from './attribution-generator'

// ============================================================================
// EXAMPLE 1: Simple Count Metric
// ============================================================================

const followUpMetrics = createMetricFamily('follow_ups', {
  name: 'Follow Ups',
  description: 'Total count of follow-up calls made',
  breakdownType: 'total',
  query: {
    table: 'appointments', // Since it's appointments table, gets assigned + booked variants
    select: ['COUNT(*) as value'],
    where: ['follow_up_call = true']
  },
  unit: 'count'
})

// Auto-generates:
// ✅ follow_ups_assigned - Follow Ups (Assigned) [👤 Assigned]
// ✅ follow_ups_booked - Follow Ups (Booked) [📅 Booked]  
// ✅ follow_ups - Follow Ups [legacy]

// ============================================================================
// EXAMPLE 2: Rate/Percentage Metric
// ============================================================================

const conversionRateMetrics = createMetricFamily('conversion_rate', {
  name: 'Conversion Rate',
  description: 'Percentage of appointments that convert to sales',
  breakdownType: 'total',
  query: {
    table: 'appointments',
    select: [
      "COALESCE(AVG(CASE WHEN show_outcome = 'won' THEN 1.0 ELSE 0.0 END), 0) as value"
    ]
  },
  unit: 'percent'
})

// Auto-generates:
// ✅ conversion_rate_assigned - Conversion Rate (Assigned) [👤 Assigned]
// ✅ conversion_rate_booked - Conversion Rate (Booked) [📅 Booked]
// ✅ conversion_rate - Conversion Rate [legacy]

// ============================================================================
// EXAMPLE 3: Currency/Revenue Metric
// ============================================================================

const revenuePerLeadMetrics = createMetricFamily('revenue_per_lead', {
  name: 'Revenue Per Lead',
  description: 'Average revenue generated per lead',
  breakdownType: 'total',
  query: {
    table: 'appointments',
    select: [
      'COALESCE(AVG(total_sales_value), 0) as value'
    ]
  },
  unit: 'currency'
})

// Auto-generates:
// ✅ revenue_per_lead_assigned - Revenue Per Lead (Assigned) [👤 Assigned]
// ✅ revenue_per_lead_booked - Revenue Per Lead (Booked) [📅 Booked]
// ✅ revenue_per_lead - Revenue Per Lead [legacy]

// ============================================================================
// EXAMPLE 4: Dial-Specific Metric (Only Gets Dialer Attribution)
// ============================================================================

const answerRateMetrics = createMetricFamily('answer_rate', {
  name: 'Answer Rate',
  description: 'Percentage of dials that were answered',
  breakdownType: 'total',
  query: {
    table: 'dials', // Since it's dials table, only gets dialer variant
    select: [
      'COALESCE(AVG(CASE WHEN answered = true THEN 1.0 ELSE 0.0 END), 0) as value'
    ]
  },
  unit: 'percent'
})

// Auto-generates:
// ✅ answer_rate_dialer - Answer Rate (Dialer) [📞 Dialer]
// ✅ answer_rate - Answer Rate [legacy]
// ❌ No assigned/booked variants (dials don't have sales_rep_user_id)

// ============================================================================
// EXAMPLE 5: Batch Creation (Multiple Metrics at Once)
// ============================================================================

import { createMetricFamilies } from './attribution-generator'

const newMetricsBatch = createMetricFamilies({
  'lead_quality_score': {
    name: 'Lead Quality Score',
    description: 'Average lead quality rating',
    breakdownType: 'total',
    query: {
      table: 'appointments',
      select: ['COALESCE(AVG(lead_quality), 0) as value']
    },
    unit: 'count'
  },
  
  'no_show_rate': {
    name: 'No Show Rate', 
    description: 'Percentage of appointments that were no-shows',
    breakdownType: 'total',
    query: {
      table: 'appointments',
      select: [
        "COALESCE(AVG(CASE WHEN call_outcome = 'No Show' THEN 1.0 ELSE 0.0 END), 0) as value"
      ]
    },
    unit: 'percent'
  },

  'call_duration_avg': {
    name: 'Average Call Duration',
    description: 'Average duration of calls in seconds',
    breakdownType: 'total',
    query: {
      table: 'dials',
      select: ['COALESCE(AVG(duration), 0) as value']
    },
    unit: 'seconds'
  }
})

// Creates ALL variants for ALL metrics automatically!
// Total metrics created: 3 base × 3 variants each = 9 metrics

// ============================================================================
// EXAMPLE 6: Adding to Main Registry
// ============================================================================

// To add these to the main registry, just add them to BASE_METRICS in registry.ts:

/*
const BASE_METRICS = {
  // ... existing metrics ...
  
  // Add your new metrics here:
  'follow_ups': {
    name: 'Follow Ups',
    description: 'Total count of follow-up calls made',
    breakdownType: 'total' as const,
    query: {
      table: 'appointments',
      select: ['COUNT(*) as value'],
      where: ['follow_up_call = true']
    },
    unit: 'count' as const
  }
  
  // That's it! Auto-generation handles the rest! 🎉
}
*/

// ============================================================================
// BENEFITS OF THIS SYSTEM:
// ============================================================================

/*
✅ Define once, get all variants automatically
✅ No manual attribution context setting
✅ No duplicate code for assigned/booked variants  
✅ Automatic UI categorization
✅ Type-safe with full TypeScript support
✅ Future-proof - works for any new metric
✅ Consistent naming and descriptions
✅ Smart attribution detection per table
✅ Zero chance of forgetting attribution variants
✅ Clean, maintainable code
*/

export {
  followUpMetrics,
  conversionRateMetrics,
  revenuePerLeadMetrics,
  answerRateMetrics,
  newMetricsBatch
} 