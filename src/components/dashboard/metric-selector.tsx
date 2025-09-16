"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"

interface MetricSelectorProps {
  selectedMetric: string | null
  onSelect: (metric: string) => void
}

// Categorize metrics for better organization
const METRIC_CATEGORIES = {
  "Appointments": [
    "total_appointments",
    "show_ups_appointments",
    "sales_made",
    "show_up_rate",
    "show_up_rate_assigned",
    "show_up_rate_booked",
    "show_up_rate_setters",
    "show_up_rate_setter_attribution",
    "appointment_to_sale_rate",
    "booking_lead_time"
  ],
  "Financial": [
    "cash_collected",
    "cash_per_sale",
    "cash_per_appointment",
    "cash_per_dial"
  ],
  "Marketing & ROI": [
    "ad_spend",
    "ad_spend_assigned", 
    "ad_spend_booked",
    "cost_per_booked_call",
    "cost_per_booked_call_assigned",
    "cost_per_booked_call_booked",
    "roi",
    "roi_assigned",
    "roi_booked"
  ],
  "Dials": [
    "total_dials",
    "answer_per_dial",
    "answer_per_dial_assigned",
    "answer_per_dial_dialer",
    "answer_per_dial_reps",
    "answer_per_dial_setters",
    "answer_per_dial_link",
    "answers_dials",
    "meaningful_conversations_dials",
    "booked_calls_dials",
    "meaningful_conversation_avg_call_length_dials",
    "dials_per_booking",
    "dials_per_booking_assigned",
    "dials_per_booking_dialer",
    "dials_per_booking_reps",
    "dials_per_booking_setters",
    "dials_per_booking_link"
  ],
  "Performance": [
    "bookings_per_hour",
    "bookings_per_hour_setters",
    "dials_per_hour", 
    "dials_per_hour_setters",
    "hours_worked",
    "hours_worked_setters"
  ],
  "Discovery": [
    "show_ups_discoveries"
  ],
  "Conversion": [
    "pitch_to_sale_rate",
    "answer_to_sale_rate",
    "booking_to_close",
    "booking_to_close_assigned",
    "booking_to_close_booked",
    "booking_to_close_reps",
    "booking_to_close_setters",
    "booking_to_close_link",
    "speed_to_lead"
  ]
}

export function MetricSelector({ selectedMetric, onSelect }: MetricSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter metrics based on search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase()
    if (!query) return METRIC_CATEGORIES

    const filtered: Record<string, string[]> = {}
    
    Object.entries(METRIC_CATEGORIES).forEach(([category, metrics]) => {
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
  }, [searchQuery])

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

  return (
    <div className="space-y-4">
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

      {/* Metrics List */}
      <div className="h-[400px] overflow-y-auto pr-4">
        <div className="space-y-6">
          {Object.entries(filteredCategories).map(([category, metrics]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
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
                      onClick={() => onSelect(metricId)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">{metric.name}</h4>
                          <Badge variant={getUnitBadgeVariant(metric.unit)} className="text-xs">
                            {formatUnit(metric.unit)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {metric.description}
                        </p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
          
          {Object.keys(filteredCategories).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No metrics found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 