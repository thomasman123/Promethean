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
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  BarChart3, 
  LineChart, 
  AreaChart, 
  Square,
  ArrowLeft,
  ArrowRight 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricSelector } from "@/components/dashboard/metric-selector"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"

interface AddWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widget: WidgetConfig) => void
}

export interface WidgetConfig {
  id: string
  type: "kpi" | "bar" | "line" | "area"
  title: string
  metric?: string // Will be set in step 2
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
  const [widgetTitle, setWidgetTitle] = useState("")
  
  const handleReset = () => {
    setCurrentStep("visualization")
    setSelectedVisualization(null)
    setSelectedMetric(null)
    setWidgetTitle("")
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
    if (!selectedVisualization || !selectedMetric) return

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: selectedVisualization as WidgetConfig["type"],
      title: widgetTitle || METRICS_REGISTRY[selectedMetric]?.name || `New ${visualizationTypes.find(v => v.id === selectedVisualization)?.name}`,
      metric: selectedMetric,
      options: {} // Additional options can be added here
    }

    onAddWidget(widget)
    handleClose()
  }

  const canProceed = () => {
    if (currentStep === "visualization") return !!selectedVisualization
    if (currentStep === "metric") return !!selectedMetric
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
            <MetricSelector
              selectedMetric={selectedMetric}
              onSelect={setSelectedMetric}
            />
          )}

          {/* Step 3: Widget Options */}
          {currentStep === "options" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="widget-title">Widget Title</Label>
                <Input
                  id="widget-title"
                  placeholder={selectedMetric ? METRICS_REGISTRY[selectedMetric]?.name : `New ${visualizationTypes.find(v => v.id === selectedVisualization)?.name}`}
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              
              <div className="text-sm text-muted-foreground mt-6">
                <p>More options will be available in future updates:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Date range preferences</li>
                  <li>Color themes</li>
                  <li>Data aggregation options</li>
                  <li>Comparison settings</li>
                </ul>
              </div>
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