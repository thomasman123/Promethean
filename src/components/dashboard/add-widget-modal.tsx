"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  BarChart3, 
  LineChart, 
  AreaChart, 
  Square,
  ArrowLeft,
  ArrowRight,
  Clock,
  Calculator 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricSelector } from "@/components/dashboard/metric-selector"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { BusinessHoursSelector } from "@/components/dashboard/business-hours-selector"

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
  options?: Record<string, any> // Additional options from step 3
}

type Step = "visualization" | "metric" | "options"

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
  
  // Speed to Lead specific options
  const [speedToLeadCalculation, setSpeedToLeadCalculation] = useState<'average' | 'median'>('average')
  const [speedToLeadTimeFormat, setSpeedToLeadTimeFormat] = useState(false)
  const [speedToLeadBusinessHours, setSpeedToLeadBusinessHours] = useState<any[]>([])
  
  const isChartType = selectedVisualization && ["bar", "line", "area"].includes(selectedVisualization)
  const isSpeedToLead = selectedMetric === 'speed_to_lead' || selectedMetrics.includes('speed_to_lead')
  
  const handleReset = () => {
    setCurrentStep("visualization")
    setSelectedVisualization(null)
    setSelectedMetric(null)
    setSelectedMetrics([])
    setWidgetTitle("")
    setSpeedToLeadCalculation('average')
    setSpeedToLeadTimeFormat(false)
    setSpeedToLeadBusinessHours([])
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleNext = () => {
    if (currentStep === "visualization" && selectedVisualization) {
      setCurrentStep("metric")
    } else if (currentStep === "metric") {
      setCurrentStep("options")
    }
  }

  const handleBack = () => {
    if (currentStep === "metric") {
      setCurrentStep("visualization")
    } else if (currentStep === "options") {
      setCurrentStep("metric")
    }
  }

  const handleCreate = () => {
    if (!selectedVisualization) return
    if (isChartType && selectedMetrics.length === 0) return
    if (!isChartType && !selectedMetric) return

    const defaultTitle = isChartType 
      ? selectedMetrics.map(m => METRICS_REGISTRY[m]?.name || m).join(' vs ')
      : METRICS_REGISTRY[selectedMetric!]?.name || `New ${visualizationTypes.find(v => v.id === selectedVisualization)?.name}`

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: selectedVisualization as WidgetConfig["type"],
      title: widgetTitle || defaultTitle,
      metric: isChartType ? undefined : (selectedMetric || undefined),
      metrics: isChartType ? selectedMetrics : undefined,
      options: {
        ...(isSpeedToLead && {
          speedToLeadCalculation,
          speedToLeadTimeFormat,
          speedToLeadBusinessHours
        })
      }
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {currentStep === "visualization" && "Select Visualization Type"}
            {currentStep === "metric" && "Select Metric"}
            {currentStep === "options" && "Widget Options"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Visualization Type */}
          {currentStep === "visualization" && (
            <div className="grid grid-cols-2 gap-4">
              {visualizationTypes.map((type) => {
                const Icon = type.icon
                return (
                  <Card
                    key={type.id}
                    className={cn(
                      "p-6 cursor-pointer transition-all hover:shadow-md",
                      selectedVisualization === type.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedVisualization(type.id)}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Icon className="h-12 w-12 text-muted-foreground" />
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Step 2: Metric Selection */}
          {currentStep === "metric" && (
            <div>
              {isChartType ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select up to 3 metrics to display on your {selectedVisualization} chart
                  </p>
                  <MetricSelector
                    selectedMetric={null}
                    onSelect={(metric) => {
                      if (!selectedMetrics.includes(metric) && selectedMetrics.length < 3) {
                        setSelectedMetrics([...selectedMetrics, metric])
                      }
                    }}
                  />
                  {selectedMetrics.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Metrics ({selectedMetrics.length}/3)</Label>
                      <div className="space-y-2">
                        {selectedMetrics.map((metric) => (
                          <div key={metric} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm">{METRICS_REGISTRY[metric]?.name || metric}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMetrics(selectedMetrics.filter(m => m !== metric))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <MetricSelector
                  selectedMetric={selectedMetric}
                  onSelect={setSelectedMetric}
                />
              )}
            </div>
          )}

          {/* Step 3: Widget Options */}
          {currentStep === "options" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="widget-title">Widget Title</Label>
                <Input
                  id="widget-title"
                  placeholder={
                    isChartType 
                      ? selectedMetrics.map(m => METRICS_REGISTRY[m]?.name || m).join(' vs ')
                      : (selectedMetric ? METRICS_REGISTRY[selectedMetric]?.name : `New ${visualizationTypes.find(v => v.id === selectedVisualization)?.name}`)
                  }
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              
              {/* Speed to Lead specific options */}
              {isSpeedToLead && (
                <>
                  {/* Calculation Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Calculation Method
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Choose how to calculate speed to lead
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={speedToLeadCalculation}
                        onValueChange={(value) => setSpeedToLeadCalculation(value as 'average' | 'median')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="average" id="average" />
                          <Label htmlFor="average" className="text-sm cursor-pointer">
                            Average (Mean)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="median" id="median" />
                          <Label htmlFor="median" className="text-sm cursor-pointer">
                            Median
                          </Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground mt-2">
                        {speedToLeadCalculation === 'average' 
                          ? 'Calculate the mean of all speed to lead times'
                          : 'Calculate the middle value, reducing impact of outliers'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Time Format */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Display Format
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="time-format" className="text-sm">
                          Show time in human-readable format
                        </Label>
                        <Switch
                          id="time-format"
                          checked={speedToLeadTimeFormat}
                          onCheckedChange={setSpeedToLeadTimeFormat}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {speedToLeadTimeFormat 
                          ? 'Display as "2h 30m" instead of seconds'
                          : 'Display raw seconds value'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Business Hours */}
                  <Card>
                    <CardContent className="pt-6">
                      <BusinessHoursSelector
                        value={speedToLeadBusinessHours}
                        onChange={setSpeedToLeadBusinessHours}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
              
              {!isSpeedToLead && (
                <div className="text-sm text-muted-foreground mt-6">
                  <p>More options will be available in future updates:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Date range preferences</li>
                    <li>Color themes</li>
                    <li>Data aggregation options</li>
                    <li>Comparison settings</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== "visualization" && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {currentStep !== "options" ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate}>
                Create Widget
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 