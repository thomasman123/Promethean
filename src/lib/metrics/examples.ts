/**
 * Examples of how to use the metrics middleware
 * These examples show common usage patterns for the sales dashboard
 */

import { metricsEngine, createMetricRequest, MetricRequest } from './index'

// Example 1: Get total appointments for a single rep
export async function getTotalAppointmentsForRep(
  accountId: string,
  repId: string,
  startDate: string,
  endDate: string
) {
  const request = createMetricRequest(
    'total_appointments_reps',
    accountId,
    startDate,
    endDate,
    { repIds: [repId] }
  )
  
  return await metricsEngine.execute(request)
}

// Example 2: Compare multiple reps
export async function compareRepsAppointments(
  accountId: string,
  repIds: string[],
  startDate: string,
  endDate: string
) {
  const request = createMetricRequest(
    'total_appointments_reps',
    accountId,
    startDate,
    endDate,
    { repIds }
  )
  
  return await metricsEngine.execute(request)
}

// Example 3: Get setter performance
export async function getSetterPerformance(
  accountId: string,
  setterId: string,
  startDate: string,
  endDate: string
) {
  const request = createMetricRequest(
    'total_appointments_setters',
    accountId,
    startDate,
    endDate,
    { setterIds: [setterId] }
  )
  
  return await metricsEngine.execute(request)
}

// Example 4: Analyze setter → rep pipeline
export async function getSetterRepPipeline(
  accountId: string,
  startDate: string,
  endDate: string,
  setterId?: string,
  repId?: string
) {
  const request = createMetricRequest(
    'appointments_link',
    accountId,
    startDate,
    endDate,
    { 
      setterIds: setterId ? [setterId] : undefined,
      repIds: repId ? [repId] : undefined
    }
  )
  
  return await metricsEngine.execute(request)
}

// Example 5: Get overall account performance
export async function getAccountOverview(
  accountId: string,
  startDate: string,
  endDate: string
) {
  // Execute multiple metrics in parallel
  const [totalAppointments, showRates, closeRates, revenue] = await Promise.all([
    metricsEngine.execute(createMetricRequest('total_appointments', accountId, startDate, endDate)),
    metricsEngine.execute(createMetricRequest('show_rate_reps', accountId, startDate, endDate)),
    metricsEngine.execute(createMetricRequest('close_rate_reps', accountId, startDate, endDate)),
    metricsEngine.execute(createMetricRequest('total_revenue_reps', accountId, startDate, endDate))
  ])
  
  return {
    totalAppointments,
    showRates,
    closeRates,
    revenue
  }
}

// Example 6: Cross-role comparison (one setter feeding multiple reps)
export async function analyzeSetterToMultipleReps(
  accountId: string,
  setterId: string,
  repIds: string[],
  startDate: string,
  endDate: string
) {
  // Get the setter → rep links
  const pipelineRequest = createMetricRequest(
    'appointments_link',
    accountId,
    startDate,
    endDate,
    { setterIds: [setterId], repIds }
  )
  
  // Get individual rep performance
  const repPerformanceRequest = createMetricRequest(
    'total_appointments_reps',
    accountId,
    startDate,
    endDate,
    { repIds }
  )
  
  const [pipeline, repPerformance] = await Promise.all([
    metricsEngine.execute(pipelineRequest),
    metricsEngine.execute(repPerformanceRequest)
  ])
  
  return {
    pipeline,
    repPerformance
  }
}

// Example 7: API usage example
export const exampleAPIRequest = {
  method: 'POST',
  url: '/api/metrics',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    metricName: 'total_appointments_reps',
    filters: {
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31'
      },
      accountId: 'account-uuid-here',
      repIds: ['rep1-uuid', 'rep2-uuid'] // Optional
    }
  })
}

// Example response format
export const exampleAPIResponse = {
  metricName: 'total_appointments_reps',
  filters: {
    dateRange: { start: '2024-01-01', end: '2024-01-31' },
    accountId: 'account-uuid-here',
    repIds: ['rep1-uuid', 'rep2-uuid']
  },
  result: {
    type: 'rep',
    data: [
      { repId: 'rep1-uuid', repName: 'John Doe', value: 25 },
      { repId: 'rep2-uuid', repName: 'Jane Smith', value: 18 }
    ]
  },
  executedAt: '2024-01-15T10:30:00.000Z',
  executionTimeMs: 156
} 