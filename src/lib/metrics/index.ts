// Main metrics module exports
export * from './types'
export * from './registry'
export * from './filters'
export * from './engine'

// Helper function to create a metric request
export function createMetricRequest(
  metricName: string,
  accountId: string,
  startDate: string,
  endDate: string,
  options?: {
    repIds?: string[]
    setterIds?: string[]
  }
) {
  return {
    metricName,
    filters: {
      dateRange: {
        start: startDate,
        end: endDate
      },
      accountId,
      repIds: options?.repIds,
      setterIds: options?.setterIds
    }
  }
} 