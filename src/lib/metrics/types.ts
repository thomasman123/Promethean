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
}

export interface MetricQuery {
  // Base table to query from
  table: string
  
  // Fields to select (can include aggregations)
  select: string[]
  
  // Additional joins if needed
  joins?: Array<{
    table: string
    on: string
    type?: 'INNER' | 'LEFT' | 'RIGHT'
  }>
  
  // Where conditions beyond the standard filters
  where?: string[]
  
  // Group by fields (for aggregations)
  groupBy?: string[]
  
  // Having conditions (for grouped queries)
  having?: string[]
  
  // Order by
  orderBy?: string[]
}

export interface MetricDefinition {
  name: string
  description: string
  breakdownType: BreakdownType
  query: MetricQuery
  unit?: 'count' | 'currency' | 'percent' | string
}

// Result types based on breakdown
export interface TotalResult {
  value: number
}

export interface RepResult {
  repId: string
  repName?: string
  value: number
}

export interface SetterResult {
  setterId: string
  setterName?: string
  value: number
}

export interface LinkResult {
  setterId: string
  setterName?: string
  repId: string
  repName?: string
  value: number
}

export interface TimeResult {
  date: string
  value: number
}

export type MetricResult = 
  | { type: 'total'; data: TotalResult }
  | { type: 'rep'; data: RepResult[] }
  | { type: 'setter'; data: SetterResult[] }
  | { type: 'link'; data: LinkResult[] }
  | { type: 'time'; data: TimeResult[] }

export interface MetricRequest {
  metricName: string
  filters: MetricFilters
}

export interface MetricResponse {
  metricName: string
  filters: MetricFilters
  result: MetricResult
  executedAt: string
  executionTimeMs: number
} 