// Core types for the metrics middleware system

export type BreakdownType = 'total' | 'rep' | 'setter' | 'link' | 'time'

export interface MetricFilters {
  dateRange: {
    start: string // ISO date string
    end: string   // ISO date string
  }
  accountId: string
  repIds?: string[]     // Array of sales rep user IDs
  setterIds?: string[]  // Array of setter user IDs

  // Advanced attribution filters (optional, apply when provided)
  utm_source?: string[]
  utm_medium?: string[]
  utm_campaign?: string[]
  utm_content?: string[]
  utm_term?: string[]
  utm_id?: string[]
  source_category?: string[]
  specific_source?: string[]
  session_source?: string[]
  referrer?: string[]
  fbclid?: string[]
  fbc?: string[]
  fbp?: string[]
  gclid?: string[]
}

export interface MetricQuery {
  // Base table to query from
  table: string
  // SELECT clause fields (first one should be the value expression with 'as value' when possible)
  select: string[]
  // Additional WHERE conditions (combined with standard filters)
  where?: string[]
  // Optional GROUP BY, HAVING, ORDER BY clauses
  groupBy?: string[]
  having?: string[]
  orderBy?: string[]
}

export interface MetricDefinition {
  name: string
  description: string
  breakdownType: BreakdownType
  query: MetricQuery
  unit?: 'count' | 'currency' | 'percent' | 'seconds' | 'days'
  attributionContext?: 'assigned' | 'booked' | 'dialer' // Context for user attribution
}

export interface MetricRequest {
  metricName: string
  filters: MetricFilters
}

export type TotalResult = { type: 'total', data: { value: number } }
export type RepResult = { type: 'rep', data: Array<{ repId: string, value: number }> }
export type SetterResult = { type: 'setter', data: Array<{ setterId: string, value: number }> }
export type LinkResult = { type: 'link', data: Array<{ from: string, to: string, value: number }> }
export type TimeResult = { type: 'time', data: Array<{ date: string, value: number }> }

export type MetricResult = TotalResult | RepResult | SetterResult | LinkResult | TimeResult

export interface MetricResponse {
  metricName: string
  filters: MetricFilters
  result: MetricResult
  executedAt: string
  executionTimeMs: number
} 