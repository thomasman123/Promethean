"use client"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { 
  BarChart3, 
  LineChart, 
  AreaChart, 
  Square,
  ArrowLeft,
  ArrowRight,
  Table
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UnifiedMetricSelector } from "@/components/shared/unified-metric-selector"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { MetricDefinition } from "@/lib/metrics/types"
import { useDashboard } from "@/lib/dashboard-context"
import { WidgetConfig } from "./add-widget-modal"

interface EditWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveWidget: (widget: WidgetConfig) => void
  widget: WidgetConfig | null
}

type Step = "visualization" | "metric" | "users"

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
  },
  {
    id: "data",
    name: "Data View",
    icon: Table,
    description: "Show metrics by user in a table format"
  }
]

export function EditWidgetModal({ open, onOpenChange, onSaveWidget, widget }: EditWidgetModalProps) {
  const { selectedAccountId } = useDashboard()
  const [currentStep, setCurrentStep] = useState<Step>("visualization")
  const [selectedVisualization, setSelectedVisualization] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, role: string}>>([])
  const [widgetTitle, setWidgetTitle] = useState("")
  const [isMetricSelectorOpen, setIsMetricSelectorOpen] = useState(false)
  const [metricsWithOptions, setMetricsWithOptions] = useState<Record<string, any>>({})
  const [usersLoading, setUsersLoading] = useState(false)
  
  const isChartType = selectedVisualization && ["bar", "line", "area"].includes(selectedVisualization)
  const isDataView = selectedVisualization === "data"

  // Initialize form with widget data when widget changes
  useEffect(() => {
    if (widget && open) {
      console.log('🔧 [EditWidget] Initializing with widget:', widget)
      setSelectedVisualization(widget.type)
      setWidgetTitle(widget.title)
      
      if (widget.type === "kpi" && widget.metric) {
        setSelectedMetric(widget.metric)
        setSelectedMetrics([])
        setMetricsWithOptions(widget.metricOptions ? { [widget.metric]: widget.metricOptions } : {})
      } else if (widget.metrics) {
        setSelectedMetrics(widget.metrics)
        setSelectedMetric(null)
        setMetricsWithOptions(widget.metricsOptions || {})
      }
      
      if (widget.selectedUsers) {
        setSelectedUsers(widget.selectedUsers)
      }
      
      // Start at metric step since visualization is already selected
      setCurrentStep("metric")
    }
  }, [widget, open])
  
  const handleReset = () => {
    setCurrentStep("visualization")
    setSelectedVisualization(null)
    setSelectedMetric(null)
    setSelectedMetrics([])
    setSelectedUsers([])
    setAvailableUsers([])
    setWidgetTitle("")
    setMetricsWithOptions({})
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleNext = () => {
    if (currentStep === "visualization" && selectedVisualization) {
      setCurrentStep("metric")
    } else if (currentStep === "metric" && isDataView && selectedMetrics.length > 0) {
      setCurrentStep("users")
      loadUsers()
    }
  }

  const handleBack = () => {
    if (currentStep === "users") {
      setCurrentStep("metric")
    } else if (currentStep === "metric") {
      setCurrentStep("visualization")
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await fetch(`/api/data-view/users?accountId=${selectedAccountId}`)
      if (response.ok) {
        const result = await response.json()
        const users = (result.users || []).map((user: any) => ({
          id: user.id,
          name: user.name,
          role: user.role
        }))
        setAvailableUsers(users)
        // Keep existing selected users or select all if none selected
        if (selectedUsers.length === 0) {
          setSelectedUsers(users.map((u: any) => u.id))
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleMetricSelect = (metricName: string, metricDefinition: MetricDefinition, options?: any) => {
    if (isChartType || isDataView) {
      // For charts and data views, add to metrics array with options and return to widget modal
        // Create a unique key that includes metric name and attribution
        const attribution = options?.attribution || "assigned"
        const metricKey = `${metricName}_${attribution}`
        
        // Check if this specific metric+attribution combo already exists
        const existingKeys = Object.keys(metricsWithOptions)
        const alreadyExists = existingKeys.some(key => key.startsWith(`${metricName}_`) && metricsWithOptions[key]?.attribution === attribution)
        
        if (!alreadyExists) {
          setSelectedMetrics(prev => [...prev, metricKey])
          setMetricsWithOptions(prev => ({ ...prev, [metricKey]: { ...options, originalMetricName: metricName } || { originalMetricName: metricName } }))
        }
      setIsMetricSelectorOpen(false)
    } else {
      // For KPI, set single metric
      setSelectedMetric(metricName)
      setMetricsWithOptions({ [metricName]: options || {} })
      setIsMetricSelectorOpen(false)
    }
  }

  const handleSaveWidget = () => {
    if (!selectedVisualization || !widget) return
    if ((isChartType || isDataView) && selectedMetrics.length === 0) return
    if (!isChartType && !isDataView && !selectedMetric) return
    if (isDataView && selectedUsers.length === 0) return

    const updatedWidget: WidgetConfig = {
      ...widget, // Keep the same ID and other properties
      type: selectedVisualization as WidgetConfig["type"],
      title: widgetTitle,
      // Clear old metric data
      metric: undefined,
      metrics: undefined,
      metricOptions: undefined,
      metricsOptions: undefined,
      selectedUsers: undefined,
    }

    // Set appropriate metric data based on type
    if (selectedVisualization === "kpi" && selectedMetric) {
      updatedWidget.metric = selectedMetric
      updatedWidget.metricOptions = metricsWithOptions[selectedMetric] || {}
    } else if (selectedMetrics.length > 0) {
      updatedWidget.metrics = selectedMetrics
      updatedWidget.metricsOptions = metricsWithOptions
    }

    if (isDataView) {
      updatedWidget.selectedUsers = selectedUsers
    }

    console.log('💾 [EditWidget] Saving widget:', updatedWidget)
    onSaveWidget(updatedWidget)
    handleClose()
  }

  const canProceed = () => {
    if (currentStep === "visualization") return !!selectedVisualization
    if (currentStep === "metric") {
      if (isChartType || isDataView) {
        return selectedMetrics.length > 0
      }
      return !!selectedMetric
    }
    if (currentStep === "users") {
      return selectedUsers.length > 0
    }
    return true
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === availableUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(availableUsers.map(u => u.id))
    }
  }

  return (
    <>
      <Dialog open={open && !isMetricSelectorOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Widget</DialogTitle>
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
              {isDataView && (
                <>
                  <div className="w-12 h-px bg-border" />
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    currentStep === "users" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    3
                  </div>
                </>
              )}
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
                    {isChartType || isDataView ? "Edit Metrics" : "Edit Metric"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isChartType || isDataView
                      ? "Click metrics to add them to your visualization. Each metric will be configured with options."
                      : "Choose the metric to display in your KPI tile"
                    }
                  </p>
                </div>

                {/* Selected Metrics Display for Charts and Data Views */}
                {(isChartType || isDataView) && selectedMetrics.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Metrics ({selectedMetrics.length})</Label>
                    <div className="space-y-2">
                      {selectedMetrics.map(metricId => {
                        const options = metricsWithOptions[metricId]
                        const optionsText = options ? Object.entries(options)
                          .filter(([key, value]) => value !== 'all' && value !== 'total')
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ') : ''
                        
                        return (
                          <div key={metricId} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{METRICS_REGISTRY[metricId]?.name || metricId}</div>
                              {optionsText && (
                                <div className="text-xs text-muted-foreground">{optionsText}</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMetrics(prev => prev.filter(m => m !== metricId))
                                setMetricsWithOptions(prev => {
                                  const { [metricId]: removed, ...rest } = prev
                                  return rest
                                })
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Metric Display for KPI */}
                {!isChartType && !isDataView && selectedMetric && (
                  <div className="space-y-2">
                    <Label>Selected Metric</Label>
                    <div className="p-2 bg-muted rounded-md">
                      <div className="font-medium text-sm">{METRICS_REGISTRY[selectedMetric]?.name || selectedMetric}</div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setIsMetricSelectorOpen(true)}
                  variant="outline"
                  className="w-full"
                >
                  {isChartType || isDataView ? "Add Metric" : "Change Metric"}
                </Button>

                {/* Widget Title */}
                <div className="space-y-2">
                  <Label>Widget Title</Label>
                  <Input
                    placeholder={isChartType || isDataView
                      ? selectedMetrics.map(m => METRICS_REGISTRY[m]?.name || m).join(' vs ')
                      : selectedMetric ? METRICS_REGISTRY[selectedMetric]?.name : "Enter title"
                    }
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === "users" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Select Users</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which users to display in your data view. Each user will be a row in the table.
                  </p>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading users...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedUsers.length === availableUsers.length}
                        onCheckedChange={handleSelectAllUsers}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Select All ({availableUsers.length} users)
                      </Label>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3">
                      {availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                          />
                          <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {selectedUsers.length} of {availableUsers.length} users selected
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={currentStep === "visualization" ? handleClose : handleBack}>
              {currentStep === "visualization" ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-2" />Back</>}
            </Button>
            
            <div className="flex gap-2">
              {currentStep === "metric" && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsMetricSelectorOpen(true)}
                  >
                    {isChartType || isDataView ? "Add Metric" : "Change Metric"}
                  </Button>
                  
                  {(isChartType && selectedMetrics.length > 0 && !isDataView) && (
                    <Button onClick={handleSaveWidget}>
                      Save Changes
                    </Button>
                  )}

                  {(!isChartType && !isDataView && selectedMetric) && (
                    <Button onClick={handleSaveWidget}>
                      Save Changes
                    </Button>
                  )}

                  {isDataView && selectedMetrics.length > 0 && (
                    <Button onClick={handleNext}>
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
              
              {currentStep === "users" && (
                <Button onClick={handleSaveWidget} disabled={selectedUsers.length === 0}>
                  Save Changes
                </Button>
              )}
              
              {currentStep === "visualization" && (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Metric Selector */}
      <UnifiedMetricSelector
        open={isMetricSelectorOpen}
        onOpenChange={setIsMetricSelectorOpen}
        onMetricSelect={handleMetricSelect}
        mode="dashboard"
        title={isChartType || isDataView ? "Add Chart Metric" : "Select KPI Metric"}
      />
    </>
  )
} 