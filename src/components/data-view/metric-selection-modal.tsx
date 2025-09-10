"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp, DollarSign, Clock, Phone, Users } from 'lucide-react'
import { METRICS_REGISTRY } from '@/lib/metrics/registry'
import { MetricDefinition } from '@/lib/metrics/types'

interface MetricSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMetricSelect: (metricName: string, metricDefinition: MetricDefinition) => void
}

export function MetricSelectionModal({ 
  open, 
  onOpenChange, 
  onMetricSelect 
}: MetricSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Get all available metrics
  const allMetrics = Object.entries(METRICS_REGISTRY).map(([metricName, definition]) => ({
    metricName,
    ...definition
  }))

  // Filter metrics based on search query
  const filteredMetrics = allMetrics.filter(metric =>
    metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.metricName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group metrics by category based on their names/types
  const categorizedMetrics = {
    appointments: filteredMetrics.filter(m => 
      m.metricName.includes('appointment') || 
      m.metricName.includes('show_up') ||
      m.metricName.includes('booking')
    ),
    sales: filteredMetrics.filter(m => 
      m.metricName.includes('sale') || 
      m.metricName.includes('cash') || 
      m.metricName.includes('won')
    ),
    dials: filteredMetrics.filter(m => 
      m.metricName.includes('dial') || 
      m.metricName.includes('answer') || 
      m.metricName.includes('conversation')
    ),
    performance: filteredMetrics.filter(m => 
      m.metricName.includes('rate') || 
      m.metricName.includes('speed') || 
      m.metricName.includes('lead_time')
    ),
    other: filteredMetrics.filter(m => 
      !m.metricName.includes('appointment') && 
      !m.metricName.includes('show_up') &&
      !m.metricName.includes('booking') &&
      !m.metricName.includes('sale') && 
      !m.metricName.includes('cash') && 
      !m.metricName.includes('won') &&
      !m.metricName.includes('dial') && 
      !m.metricName.includes('answer') && 
      !m.metricName.includes('conversation') &&
      !m.metricName.includes('rate') && 
      !m.metricName.includes('speed') && 
      !m.metricName.includes('lead_time')
    )
  }

  const getUnitIcon = (unit?: string) => {
    switch (unit) {
      case 'currency':
        return <DollarSign className="h-4 w-4" />
      case 'percent':
        return <TrendingUp className="h-4 w-4" />
      case 'seconds':
      case 'days':
        return <Clock className="h-4 w-4" />
      case 'count':
        return <Users className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case 'currency':
        return 'Currency'
      case 'percent':
        return 'Percentage'
      case 'seconds':
        return 'Seconds'
      case 'days':
        return 'Days'
      case 'count':
        return 'Count'
      default:
        return 'Value'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointments':
        return <Users className="h-4 w-4" />
      case 'sales':
        return <DollarSign className="h-4 w-4" />
      case 'dials':
        return <Phone className="h-4 w-4" />
      case 'performance':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const handleMetricSelect = (metricName: string, definition: MetricDefinition) => {
    onMetricSelect(metricName, definition)
    onOpenChange(false)
    setSearchQuery('')
  }

  const renderMetricCategory = (title: string, metrics: typeof allMetrics, category: string) => {
    if (metrics.length === 0) return null

    return (
      <div key={category} className="space-y-3">
        <div className="flex items-center gap-2">
          {getCategoryIcon(category)}
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
        </div>
        <div className="grid gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.metricName}
              className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => handleMetricSelect(metric.metricName, metric)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getUnitIcon(metric.unit)}
                    <h4 className="font-medium text-sm">{metric.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {metric.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getUnitLabel(metric.unit)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Metric Column</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Metrics List */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {renderMetricCategory('Appointments', categorizedMetrics.appointments, 'appointments')}
            {renderMetricCategory('Sales & Revenue', categorizedMetrics.sales, 'sales')}
            {renderMetricCategory('Dials & Calls', categorizedMetrics.dials, 'dials')}
            {renderMetricCategory('Performance Rates', categorizedMetrics.performance, 'performance')}
            {renderMetricCategory('Other Metrics', categorizedMetrics.other, 'other')}
            
            {filteredMetrics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No metrics found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 