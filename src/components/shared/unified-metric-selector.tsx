"use client"

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ArrowLeft } from 'lucide-react'
import { METRICS_REGISTRY } from '@/lib/metrics/registry'
import { MetricDefinition } from '@/lib/metrics/types'
import { cn } from '@/lib/utils'

interface UnifiedMetricSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMetricSelect: (metricName: string, metricDefinition: MetricDefinition, options?: any) => void
  mode: 'dashboard' | 'data-view'
  title?: string
  tableType?: 'user_metrics' | 'account_metrics' | 'time_series'
}

// Use the same categorization as both dashboard and data view
const METRIC_CATEGORIES = {
  "Appointments": [
    "total_appointments",
    "show_ups",
    "sales_made",
    "show_up_rate",
    "appointment_to_sale_rate"
  ],
  "Financial": [
    "cash_collected",
    "cash_per_sale",
    "cash_per_appointment",
    "cash_per_dial",
    "average_contract_value_per_sale",
    "total_revenue_generated"
  ],
  "Payment": [
    "pif_rate",
    "cash_collection_rate"
  ],
  "Quality": [
    "lead_quality",
    "discovery_lead_quality"
  ],
  "Marketing & ROI": [
    "ad_spend",
    "cost_per_booked_call",
    "roi"
  ],
  "Leads": [
    "total_leads",
    "lead_to_appointment"
  ],
  "Dials": [
    "total_dials",
    "answers",
    "meaningful_conversations",
    "booked_calls",
    "meaningful_conversation_avg_call_length",
    "answer_per_dial",
    "dials_per_booking"
  ],
  "Performance": [
    "bookings_per_hour",
    "dials_per_hour",
    "hours_worked"
  ],
  "Discovery": [
    "total_discoveries",
    "show_ups_discoveries"
  ],
  "Conversion": [
    "pitch_to_sale_rate",
    "answer_to_sale_rate",
    "answer_to_conversation_ratio",
    "meaningful_conversation_to_booking_ratio",
    "booking_to_close",
    "speed_to_lead"
  ]
}

// Define which metrics are interchangeable vs account-only
const INTERCHANGEABLE_METRICS = [
  // From appointments table
  'total_appointments', 'show_ups', 'sales_made', 'show_up_rate', 'appointment_to_sale_rate',
  'cash_collected', 'cash_per_sale', 'cash_per_appointment', 'average_contract_value_per_sale', 'total_revenue_generated',
  'pif_rate', 'cash_collection_rate', 'lead_quality', 'pitch_to_sale_rate', 'answer_to_sale_rate', 'booking_to_close',
  
  // From dials table
  'total_dials', 'answers', 'meaningful_conversations', 'booked_calls', 'meaningful_conversation_avg_call_length',
  'answer_per_dial', 'dials_per_booking', 'cash_per_dial', 'answer_to_conversation_ratio', 'meaningful_conversation_to_booking_ratio',
  
  // From discoveries table
  'total_discoveries', 'show_ups_discoveries', 'discovery_lead_quality',
  
  // From work_timeframes table (derived from dials)
  'bookings_per_hour', 'dials_per_hour', 'hours_worked'
]

const ACCOUNT_ONLY_METRICS = [
  // From contacts table
  'total_leads', 'lead_to_appointment',
  
  // From meta ads tables
  'ad_spend', 'cost_per_booked_call', 'roi',
  
  // Cross-table/complex
  'speed_to_lead'
]

export function UnifiedMetricSelector({ 
  open, 
  onOpenChange, 
  onMetricSelect,
  mode,
  title,
  tableType
}: UnifiedMetricSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<any>({})

  // Filter metrics based on search query and table type
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase()
    
    // Filter metrics based on table type
    const getAvailableMetrics = (metrics: string[]) => {
      return metrics.filter(metricId => {
        // For user metrics tables: show interchangeable metrics only
        if (tableType === 'user_metrics') {
          return INTERCHANGEABLE_METRICS.includes(metricId)
        }
        
        // For account metrics tables: show all metrics (interchangeable + account-only)
        if (tableType === 'account_metrics') {
          return INTERCHANGEABLE_METRICS.includes(metricId) || ACCOUNT_ONLY_METRICS.includes(metricId)
        }
        
        // For time series tables: show all metrics (for now)
        if (tableType === 'time_series') {
          return INTERCHANGEABLE_METRICS.includes(metricId) || ACCOUNT_ONLY_METRICS.includes(metricId)
        }
        
        // For dashboard mode: show all metrics
        return true
      })
    }

    let categories: Record<string, string[]> = METRIC_CATEGORIES
    
    // Apply table type filtering if specified
    if (tableType) {
      categories = Object.fromEntries(
        Object.entries(METRIC_CATEGORIES).map(([category, metrics]) => [
          category,
          getAvailableMetrics(metrics)
        ])
      ) as Record<string, string[]>
    }

    // Apply search filtering
    if (!query) return categories

    const filtered: Record<string, string[]> = {}
    
    Object.entries(categories).forEach(([category, metrics]) => {
      const matchingMetrics = metrics.filter(metricId => {
        const metric = METRICS_REGISTRY[metricId]
        if (!metric) return false
        
        return (
          metric.name.toLowerCase().includes(query) ||
          metric.description.toLowerCase().includes(query) ||
          metricId.toLowerCase().includes(query)
        )
      })
      
      if (matchingMetrics.length > 0) {
        filtered[category] = matchingMetrics
      }
    })
    
    return filtered
  }, [searchQuery, tableType])

  const getUnitBadgeVariant = (unit?: string) => {
    switch (unit) {
      case 'currency':
        return 'default'
      case 'percent':
        return 'secondary'
      case 'count':
        return 'outline'
      case 'seconds':
      case 'days':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatUnit = (unit?: string) => {
    switch (unit) {
      case 'currency':
        return '$'
      case 'percent':
        return '%'
      case 'count':
        return '#'
      case 'seconds':
        return 's'
      case 'days':
        return 'd'
      default:
        return unit || ''
    }
  }

  const handleMetricSelect = (metricId: string) => {
    const metric = METRICS_REGISTRY[metricId]
    if (!metric) return

    setSelectedMetric(metricId)
    
    // If metric has options, show options step
    if (metric.options && Object.keys(metric.options).length > 0) {
      setShowOptions(true)
      // Set default options based on mode
      const defaultOptions: any = {}
      
      if (metric.options.attribution) {
        defaultOptions.attribution = metric.options.attribution[0]
      }
      
      // For dashboard, include breakdown options; for data view, skip breakdown
      if (mode === 'dashboard' && metric.options.breakdown) {
        defaultOptions.breakdown = metric.options.breakdown[0]
      }
      
      if (metric.options.timeFormat) {
        defaultOptions.timeFormat = metric.options.timeFormat[0]
      }
      if (metric.options.calculation) {
        defaultOptions.calculation = metric.options.calculation[0]
      }
      if (metric.options.businessHours) {
        defaultOptions.businessHours = metric.options.businessHours[0]
      }
      setSelectedOptions(defaultOptions)
    } else {
      // No options, proceed directly
      onMetricSelect(metricId, metric)
      onOpenChange(false)
      resetState()
    }
  }

  const handleConfirmWithOptions = () => {
    if (!selectedMetric) return
    
    const metric = METRICS_REGISTRY[selectedMetric]
    if (metric) {
      onMetricSelect(selectedMetric, metric, selectedOptions)
      onOpenChange(false)
      resetState()
    }
  }

  const resetState = () => {
    setSearchQuery('')
    setSelectedMetric(null)
    setShowOptions(false)
    setSelectedOptions({})
  }

  const handleBack = () => {
    setShowOptions(false)
    setSelectedMetric(null)
    setSelectedOptions({})
  }

  const selectedMetricDef = selectedMetric ? METRICS_REGISTRY[selectedMetric] : null

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetState()
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {title || (showOptions ? 'Configure Metric Options' : mode === 'dashboard' ? 'Add Widget' : 'Add Metric Column')}
          </DialogTitle>
        </DialogHeader>
        
        {!showOptions ? (
          <div className="space-y-4 flex-1 min-h-0">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Metrics List - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-4 max-h-[60vh]">
              <div className="space-y-6">
                {Object.entries(filteredCategories).map(([category, metrics]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                      {category}
                    </h3>
                    <div className="grid gap-2">
                      {metrics.map((metricId) => {
                        const metric = METRICS_REGISTRY[metricId]
                        if (!metric) return null

                        return (
                          <Card
                            key={metricId}
                            className={cn(
                              "p-3 cursor-pointer transition-all hover:bg-accent/50",
                              selectedMetric === metricId && "ring-2 ring-primary bg-accent"
                            )}
                            onClick={() => handleMetricSelect(metricId)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">{metric.name}</h4>
                                <div className="flex gap-1">
                                  <Badge variant={getUnitBadgeVariant(metric.unit)} className="text-xs">
                                    {formatUnit(metric.unit)}
                                  </Badge>
                                  {metric.options?.attribution && (
                                    <Badge variant="outline" className="text-xs">
                                      Attr
                                    </Badge>
                                  )}
                                  {metric.options?.breakdown && mode === 'dashboard' && (
                                    <Badge variant="outline" className="text-xs">
                                      Break
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {metric.description}
                              </p>
                              {metric.options && (
                                <div className="text-xs text-muted-foreground">
                                  {metric.options.attribution && (
                                    <span>Attribution: {metric.options.attribution.join(', ')} </span>
                                  )}
                                  {metric.options.breakdown && mode === 'dashboard' && (
                                    <span>Breakdown: {metric.options.breakdown.join(', ')}</span>
                                  )}
                                  {metric.options.timeFormat && (
                                    <span>Time Format: {metric.options.timeFormat.join(', ')}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                {Object.keys(filteredCategories).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No metrics found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Options Configuration Step */
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="font-medium">{selectedMetricDef?.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedMetricDef?.description}</p>
              </div>
            </div>

            <div className="grid gap-4">
              {/* Attribution Options */}
              {selectedMetricDef?.options?.attribution && (
                <div className="space-y-2">
                  <Label>Attribution</Label>
                  <Select 
                    value={selectedOptions.attribution || selectedMetricDef.options.attribution[0]}
                    onValueChange={(value) => setSelectedOptions((prev: any) => ({ ...prev, attribution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetricDef.options.attribution.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? 'All Attribution' : 
                           option === 'assigned' ? 'Assigned Sales Rep' :
                           option === 'booked' ? 'Setter Who Booked' :
                           option === 'dialer' ? 'Dialer' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Breakdown Options - Only show for dashboard */}
              {mode === 'dashboard' && selectedMetricDef?.options?.breakdown && (
                <div className="space-y-2">
                  <Label>Breakdown</Label>
                  <Select 
                    value={selectedOptions.breakdown || selectedMetricDef.options.breakdown[0]}
                    onValueChange={(value) => setSelectedOptions((prev: any) => ({ ...prev, breakdown: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetricDef.options.breakdown.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'total' ? 'Total (Single Value)' :
                           option === 'reps' ? 'By Sales Rep' :
                           option === 'setters' ? 'By Setter' :
                           option === 'link' ? 'Setter→Rep Links' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Data view automatically breaks down by user, so breakdown options are only available for dashboard widgets.
                  </p>
                </div>
              )}

              {/* Time Format Options */}
              {selectedMetricDef?.options?.timeFormat && (
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select 
                    value={selectedOptions.timeFormat || selectedMetricDef.options.timeFormat[0]}
                    onValueChange={(value) => setSelectedOptions((prev: any) => ({ ...prev, timeFormat: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetricDef.options.timeFormat.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'seconds' ? 'Seconds (e.g., 210s)' :
                           option === 'minutes' ? 'Minutes (e.g., 3.5m)' :
                           option === 'hours' ? 'Hours (e.g., 0.06h)' :
                           option === 'human_readable' ? 'Human Readable (e.g., 3m 30s)' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Calculation Options */}
              {selectedMetricDef?.options?.calculation && (
                <div className="space-y-2">
                  <Label>Calculation</Label>
                  <Select 
                    value={selectedOptions.calculation || selectedMetricDef.options.calculation[0]}
                    onValueChange={(value) => setSelectedOptions((prev: any) => ({ ...prev, calculation: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetricDef.options.calculation.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'average' ? 'Average' :
                           option === 'median' ? 'Median' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Business Hours Options */}
              {selectedMetricDef?.options?.businessHours && (
                <div className="space-y-2">
                  <Label>Business Hours</Label>
                  <Select 
                    value={selectedOptions.businessHours || selectedMetricDef.options.businessHours[0]}
                    onValueChange={(value) => setSelectedOptions((prev: any) => ({ ...prev, businessHours: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetricDef.options.businessHours.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option === 'include' ? 'Include Business Hours' :
                           option === 'exclude' ? 'Exclude Business Hours' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Mode-specific help text */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {mode === 'dashboard' 
                    ? "Dashboard widgets can show totals or breakdowns by rep/setter. Choose your attribution and breakdown preferences."
                    : "Data view automatically shows metrics per user. Choose your attribution and formatting preferences."
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {showOptions && (
            <Button onClick={handleConfirmWithOptions}>
              {mode === 'dashboard' ? 'Add Widget' : 'Add Metric Column'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 