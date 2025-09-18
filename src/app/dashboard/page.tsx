"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import { TopBar } from "@/components/layout/topbar"
import { Widget } from "@/components/dashboard/widget"
import { MetricWidget } from "@/components/dashboard/metric-widget"
import { WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Loading } from "@/components/ui/loading"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Default widgets for new views - now empty so new views start clean
const defaultWidgets: WidgetConfig[] = []

// Default layouts - empty since new views start with no widgets
const defaultLayouts = {
  lg: [] as any[],
  md: [] as any[],
  sm: [] as any[],
}

interface ViewData {
  widgets: WidgetConfig[]
  layouts: any
}

export default function DashboardPage() {
  const { selectedAccountId, currentViewId, setCurrentViewId } = useDashboard()
  const [layouts, setLayouts] = useState(defaultLayouts)
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved view from localStorage on mount
  useEffect(() => {
    const savedViewId = localStorage.getItem('lastSelectedViewId')
    if (savedViewId && !currentViewId) {
      setCurrentViewId(savedViewId)
    }
  }, [])

  // Save current view to localStorage when it changes
  useEffect(() => {
    if (currentViewId) {
      localStorage.setItem('lastSelectedViewId', currentViewId)
    }
  }, [currentViewId])

  // Monitor when accounts are loaded by checking if selectedAccountId is set
  useEffect(() => {
    if (selectedAccountId) {
      console.log('🔍 [Dashboard] Accounts loaded, selectedAccountId set:', selectedAccountId)
      setAccountsLoaded(true)
    } else {
      console.log('🔍 [Dashboard] Waiting for selectedAccountId to be set...')
      setAccountsLoaded(false)
    }
  }, [selectedAccountId])

  // Load view data when BOTH account is loaded AND view changes
  useEffect(() => {
    console.log('🔍 [Dashboard] Dependencies check - accountsLoaded:', accountsLoaded, 'currentViewId:', currentViewId, 'selectedAccountId:', selectedAccountId)
    
    if (accountsLoaded && currentViewId && selectedAccountId) {
      console.log('✅ [Dashboard] All dependencies ready, loading view data')
      void loadViewData()
    } else {
      console.log('⏳ [Dashboard] Waiting for dependencies - need accounts loaded AND view selected')
    }
  }, [accountsLoaded, currentViewId, selectedAccountId])

  const loadViewData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/views?accountId=${selectedAccountId}`)
      if (response.ok) {
        const data = await response.json()
        const currentView = data.views?.find((v: any) => v.id === currentViewId)
        
        if (currentView && currentView.widgets) {
          // Load widgets and layouts from the view
          const viewData = currentView.widgets as ViewData
          
          // One-time fix: Reset all widget sizes to proper minimums
          const resetKey = `dashboardReset_${selectedAccountId}_${currentViewId}_v2`
          const hasReset = localStorage.getItem(resetKey)
          
          if (!hasReset) {
            // Force reset to default layouts with proper sizes
            localStorage.setItem(resetKey, 'true')
            const resetLayouts = JSON.parse(JSON.stringify(defaultLayouts))
            setWidgets(defaultWidgets)
            setLayouts(resetLayouts)
            saveViewData(defaultWidgets, resetLayouts)
            return
          }
          if (Array.isArray(viewData)) {
            // Old format - just widgets array
            const loadedWidgets = viewData
            let loadedLayouts = JSON.parse(JSON.stringify(defaultLayouts))
            
            // Apply minimum size constraints to chart widgets
            Object.keys(loadedLayouts).forEach((breakpoint) => {
              loadedLayouts[breakpoint] = loadedLayouts[breakpoint].map((item: any) => {
                const widget = loadedWidgets.find((w: WidgetConfig) => w.id === item.i)
                if (widget && ['bar', 'line', 'area'].includes(widget.type)) {
                  // Enforce minimum 2x2 size for charts
                  return {
                    ...item,
                    w: Math.max(item.w, 2),
                    h: Math.max(item.h, 2),
                    minW: 2,
                    minH: 2
                  }
                }
                return item
              })
            })
            
            setWidgets(loadedWidgets)
            setLayouts(loadedLayouts)
          } else if (viewData.widgets && viewData.layouts) {
            // New format - widgets and layouts
            const loadedWidgets = viewData.widgets
            let loadedLayouts = viewData.layouts
            
            // Apply minimum size constraints to chart widgets in loaded layouts
            Object.keys(loadedLayouts).forEach((breakpoint) => {
              loadedLayouts[breakpoint] = loadedLayouts[breakpoint].map((item: any) => {
                const widget = loadedWidgets.find((w: WidgetConfig) => w.id === item.i)
                if (widget && ['bar', 'line', 'area'].includes(widget.type)) {
                  // Enforce minimum 2x2 size for charts
                  return {
                    ...item,
                    w: Math.max(item.w, 2),
                    h: Math.max(item.h, 2),
                    minW: 2,
                    minH: 2
                  }
                }
                return item
              })
            })
            
            setWidgets(loadedWidgets)
            setLayouts(loadedLayouts)
          } else {
            // No widgets yet
            setWidgets(defaultWidgets)
            setLayouts(defaultLayouts)
          }
        } else {
          // New view or no widgets
          setWidgets(defaultWidgets)
          setLayouts(defaultLayouts)
        }
      }
    } catch (error) {
      console.error("Failed to load view data:", error)
      setWidgets(defaultWidgets)
      setLayouts(defaultLayouts)
    } finally {
      setLoading(false)
    }
  }

  const saveViewData = useCallback(async (newWidgets?: WidgetConfig[], newLayouts?: any) => {
    if (!currentViewId) return

    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce saves by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const viewData: ViewData = {
          widgets: newWidgets || widgets,
          layouts: newLayouts || layouts
        }

        await fetch('/api/dashboard/views', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentViewId,
            widgets: viewData
          })
        })
      } catch (error) {
        console.error("Failed to save view data:", error)
      }
    }, 1000)
  }, [currentViewId, widgets, layouts])

  const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    // Apply minimum size constraints to chart widgets
    const constrainedLayouts = { ...allLayouts }
    
    Object.keys(constrainedLayouts).forEach((breakpoint) => {
      constrainedLayouts[breakpoint] = constrainedLayouts[breakpoint].map((item: any) => {
        const widget = widgets.find(w => w.id === item.i)
        if (widget && ['bar', 'line', 'area'].includes(widget.type)) {
          // Enforce minimum 2x2 size for charts
          return {
            ...item,
            w: Math.max(item.w, 2),
            h: Math.max(item.h, 2),
            minW: 2,
            minH: 2
          }
        }
        return item
      })
    })
    
    setLayouts(constrainedLayouts)
    saveViewData(undefined, constrainedLayouts)
  }, [saveViewData, widgets])

  const handleAddWidget = useCallback((widget: WidgetConfig) => {
    // Add the new widget to the widgets array
    const newWidgets = [...widgets, widget]
    setWidgets(newWidgets)
    
    // With vertical compacting, new widgets can be placed at (0, 0)
    // The grid will automatically push them to the first available position
    const position = { x: 0, y: 0 }
    
    // Add layout for the new widget across all breakpoints
    const newLayouts = { ...layouts }
    
    // Determine default size based on widget type
    const getDefaultSize = (type: string) => {
      switch (type) {
        case "kpi":
          return { w: 1, h: 1 } // 1x1 for KPI widgets
        case "bar":
        case "line":
        case "area":
          return { w: 2, h: 2 } // 2x2 minimum for charts
        default:
          return { w: 1, h: 1 }
      }
    }
    
    const size = getDefaultSize(widget.type)
    
    // Add to all breakpoint layouts with minimum size constraints for charts
    const isChart = ['bar', 'line', 'area'].includes(widget.type)
    const minConstraints = isChart ? { minW: 2, minH: 2 } : {}
    
    newLayouts.lg.push({ i: widget.id, x: position.x, y: position.y, ...size, ...minConstraints })
    newLayouts.md.push({ i: widget.id, x: 0, y: position.y, ...size, ...minConstraints })
    newLayouts.sm.push({ i: widget.id, x: 0, y: position.y, w: 2, h: isChart ? 2 : 1, ...minConstraints })
    
    setLayouts(newLayouts)
    saveViewData(newWidgets, newLayouts)
  }, [widgets, layouts, saveViewData])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    // Remove widget from widgets array
    const newWidgets = widgets.filter(w => w.id !== widgetId)
    setWidgets(newWidgets)
    
    // Remove widget from all layouts
    const newLayouts = {
      lg: layouts.lg.filter(item => item.i !== widgetId),
      md: layouts.md.filter(item => item.i !== widgetId),
      sm: layouts.sm.filter(item => item.i !== widgetId)
    }
    
    setLayouts(newLayouts)
    saveViewData(newWidgets, newLayouts)
  }, [widgets, layouts, saveViewData])

  const renderWidgetContent = (widget: WidgetConfig) => {
    // For KPI widgets with single metric
    if (widget.type === "kpi" && widget.metric) {
      return <MetricWidget metric={widget.metric} type={widget.type} options={widget.options} />
    }
    
    // For chart widgets with multiple metrics
    if ((widget.type === "bar" || widget.type === "line" || widget.type === "area") && widget.metrics) {
      return <MetricWidget metrics={widget.metrics} type={widget.type} options={widget.options} />
    }
    
    // For backward compatibility - chart with single metric
    if ((widget.type === "bar" || widget.type === "line" || widget.type === "area") && widget.metric) {
      return <MetricWidget metrics={[widget.metric]} type={widget.type} options={widget.options} />
    }
    
    // Otherwise render placeholder content
    switch (widget.type) {
      case "kpi":
        return (
          <div className="h-full flex items-center justify-center">
            <span className="text-3xl lg:text-4xl xl:text-5xl font-bold">--</span>
          </div>
        )
      case "bar":
      case "line":
      case "area":
        return (
          <div className="h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Chart visualization</span>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar onAddWidget={handleAddWidget} />
        <main className="pt-16 h-screen overflow-y-auto">
          <Loading text="Loading dashboard..." />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onAddWidget={handleAddWidget} />
      
      <main className="pt-16 h-screen overflow-y-auto">
        <div className="p-6">
          {!currentViewId ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-muted-foreground">Please select or create a view to get started</span>
            </div>
          ) : (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              breakpoints={{ lg: 1200, md: 768, sm: 0 }}
              cols={{ lg: 6, md: 4, sm: 2 }}
              rowHeight={120}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              resizeHandles={["se"]}
              isDraggable={true}
              isResizable={true}
              compactType="vertical"
              preventCollision={false}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="h-full w-full">
                  <Widget 
                    title={widget.title}
                    onRemove={() => handleRemoveWidget(widget.id)}
                    reducedPadding={['bar', 'line', 'area'].includes(widget.type)}
                  >
                    {renderWidgetContent(widget)}
                  </Widget>
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </main>
    </div>
  )
} 