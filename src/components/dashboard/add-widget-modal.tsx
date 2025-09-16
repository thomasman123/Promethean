"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  BarChart3, 
  LineChart, 
  AreaChart, 
  Square,
  ArrowLeft,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UnifiedMetricSelector } from "@/components/shared/unified-metric-selector"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { MetricDefinition } from "@/lib/metrics/types"

interface AddWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widget: WidgetConfig) => void
}

export interface WidgetConfig {
  id: string
  type: "kpi" | "bar" | "line" | "area"
  title: string
  metric?: string // For single metric (KPI)
  metrics?: string[] // For multiple metrics (charts)
  options?: Record<string, any> // Additional options
}

type Step = "visualization" | "metric"

const visualizationTypes = [
  {
    id: "kpi",
    name: "KPI Tile",
    icon: Square,
    description: "Display a single key metric"
  },
  {
    id: "bar",
    name: "Bar Chart",
    icon: BarChart3,
    description: "Compare values across categories"
  },
  {
    id: "line",
    name: "Line Chart",
    icon: LineChart,
    description: "Show trends over time"
  },
  {
    id: "area",
    name: "Area Chart",
    icon: AreaChart,
    description: "Visualize cumulative data"
  }
]

export function AddWidgetModal({ open, onOpenChange, onAddWidget }: AddWidgetModalProps) {
  
  const [currentStep, setCurrentStep] = useState<Step>("visualization")
  const [selectedVisualization, setSelectedVisualization] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [widgetTitle, setWidgetTitle] = useState("")
  const [isMetricSelectorOpen, setIsMetricSelectorOpen] = useState(false)
  
  const isChartType = selectedVisualization && ["bar", "line", "area"].includes(selectedVisualization)
  
  const handleReset = () => {
    setCurrentStep("visualization")
    setSelectedVisualization(null)
    setSelectedMetric(null)
    setSelectedMetrics([])
    setWidgetTitle("")
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleNext = () => {
    if (currentStep === "visualization" && selectedVisualization) {
      setCurrentStep("metric")
    }
  }

  const handleBack = () => {
    if (currentStep === "metric") {
      setCurrentStep("visualization")
    }
  }

  const handleMetricSelect = (metricName: string, metricDefinition: MetricDefinition, options?: any) => {
    if (isChartType) {
      // For charts, add to metrics array
      if (!selectedMetrics.includes(metricName)) {
        setSelectedMetrics(prev => [...prev, metricName])
      }
    } else {
      // For KPI, set single metric
      setSelectedMetric(metricName)
    }
    
    // Create widget immediately with options
    const defaultTitle = isChartType 
      ? [...selectedMetrics, metricName].map(m => METRICS_REGISTRY[m]?.name || m).join(' vs ')
      : metricDefinition.name

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: selectedVisualization as WidgetConfig["type"],
      title: widgetTitle || defaultTitle,
      metric: isChartType ? undefined : metricName,
      metrics: isChartType ? [...selectedMetrics, metricName] : undefined,
      options: options || {}
    }

    onAddWidget(widget)
    handleClose()
  }

  const canProceed = () => {
    if (currentStep === "visualization") return !!selectedVisualization
    if (currentStep === "metric") {
      if (isChartType) {
        return selectedMetrics.length > 0
      }
      return !!selectedMetric
    }
    return true
  }

  return (
    <>
      <Dialog open={open && !isMetricSelectorOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-2">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium", 
                currentStep === "visualization" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                1
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === "metric" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                2
              </div>
            </div>

            {/* Step Content */}
            {currentStep === "visualization" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Choose Visualization Type</h3>
                  <p className="text-sm text-muted-foreground">Select how you want to display your data</p>
                </div>
                
                <RadioGroup value={selectedVisualization || ""} onValueChange={setSelectedVisualization}>
                  <div className="grid grid-cols-2 gap-4">
                    {visualizationTypes.map((viz) => (
                      <div key={viz.id}>
                        <RadioGroupItem value={viz.id} id={viz.id} className="sr-only" />
                        <Card 
                          className={cn(
                            "cursor-pointer transition-all hover:bg-accent/50",
                            selectedVisualization === viz.id && "ring-2 ring-primary bg-accent"
                          )}
                          onClick={() => setSelectedVisualization(viz.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center space-x-2">
                              <viz.icon className="h-5 w-5" />
                              <CardTitle className="text-base">{viz.name}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <CardDescription className="text-sm">{viz.description}</CardDescription>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {currentStep === "metric" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    {isChartType ? "Add Metrics" : "Select Metric"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isChartType 
                      ? "Click metrics to add them to your chart. Each metric will be configured with options."
                      : "Choose the metric to display in your KPI tile"
                    }
                  </p>
                </div>

                {/* Selected Metrics Display for Charts */}
                {isChartType && selectedMetrics.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Metrics ({selectedMetrics.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMetrics.map(metricId => (
                        <Button
                          key={metricId}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMetrics(prev => prev.filter(m => m !== metricId))}
                        >
                          {METRICS_REGISTRY[metricId]?.name || metricId} ×
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setIsMetricSelectorOpen(true)}
                  variant="outline"
                  className="w-full"
                >
                  {isChartType ? "Add Metric" : "Select Metric"}
                </Button>

                {/* Widget Title */}
                <div className="space-y-2">
                  <Label>Widget Title (Optional)</Label>
                  <Input
                    placeholder={isChartType 
                      ? selectedMetrics.map(m => METRICS_REGISTRY[m]?.name || m).join(' vs ')
                      : selectedMetric ? METRICS_REGISTRY[selectedMetric]?.name : "Enter title"
                    }
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={currentStep === "visualization" ? handleClose : handleBack}>
              {currentStep === "visualization" ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-2" />Back</>}
            </Button>
            
            {currentStep === "metric" && canProceed() ? (
              <Button onClick={() => setIsMetricSelectorOpen(true)}>
                {isChartType ? "Add Metrics" : "Select Metric"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Metric Selector */}
      <UnifiedMetricSelector
        open={isMetricSelectorOpen}
        onOpenChange={setIsMetricSelectorOpen}
        onMetricSelect={handleMetricSelect}
        mode="dashboard"
        title={isChartType ? "Add Chart Metric" : "Select KPI Metric"}
      />
    </>
  )
} 