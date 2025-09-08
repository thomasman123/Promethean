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

const ResponsiveGridLayout = WidthProvider(Responsive)

// Default widgets for new views
const defaultWidgets: WidgetConfig[] = [
  { id: "widget-1", type: "kpi", title: "Total Appointments", metric: "total_appointments" },
  { id: "widget-2", type: "kpi", title: "Show Rate", metric: "show_up_rate" },
  { id: "widget-3", type: "kpi", title: "Answer Rate", metric: "answers_dials" },
  { id: "widget-4", type: "kpi", title: "Speed to Lead", metric: "speed_to_lead" },
  { id: "widget-5", type: "line", title: "Performance Overview" },
  { id: "widget-6", type: "area", title: "Recent Activity" },
  { id: "widget-7", type: "kpi", title: "Revenue", metric: "cash_collected" },
  { id: "widget-8", type: "kpi", title: "Active Users" },
  { id: "widget-9", type: "kpi", title: "Conversion Rate", metric: "appointment_to_sale_rate" },
]

// Default layouts for different breakpoints - optimized for content fit
const defaultLayouts = {
  lg: [
    { i: "widget-1", x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-2", x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-3", x: 4, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-4", x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-5", x: 2, y: 2, w: 4, h: 3, minW: 3, minH: 3 },
    { i: "widget-6", x: 0, y: 5, w: 3, h: 3, minW: 3, minH: 3 },
    { i: "widget-7", x: 3, y: 5, w: 3, h: 3, minW: 3, minH: 3 },
    { i: "widget-8", x: 0, y: 8, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-9", x: 2, y: 8, w: 2, h: 2, minW: 2, minH: 2 },
  ],
  md: [
    { i: "widget-1", x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-2", x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-3", x: 4, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-4", x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-5", x: 2, y: 2, w: 4, h: 3, minW: 3, minH: 3 },
    { i: "widget-6", x: 0, y: 5, w: 6, h: 3, minW: 4, minH: 3 },
    { i: "widget-7", x: 0, y: 8, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-8", x: 2, y: 8, w: 2, h: 2, minW: 2, minH: 2 },
    { i: "widget-9", x: 4, y: 8, w: 2, h: 2, minW: 2, minH: 2 },
  ],
  sm: [
    { i: "widget-1", x: 0, y: 0, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-2", x: 0, y: 2, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-3", x: 0, y: 4, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-4", x: 0, y: 6, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-5", x: 0, y: 8, w: 6, h: 3, minW: 6, minH: 3 },
    { i: "widget-6", x: 0, y: 11, w: 6, h: 3, minW: 6, minH: 3 },
    { i: "widget-7", x: 0, y: 14, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-8", x: 0, y: 16, w: 6, h: 2, minW: 6, minH: 2 },
    { i: "widget-9", x: 0, y: 18, w: 6, h: 2, minW: 6, minH: 2 },
  ],
}

interface ViewData {
  widgets: WidgetConfig[]
  layouts: any
}

export default function DashboardPage() {
  const { selectedAccountId, currentViewId } = useDashboard()
  const [layouts, setLayouts] = useState(defaultLayouts)
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load view data when view changes
  useEffect(() => {
    if (currentViewId && selectedAccountId) {
      void loadViewData()
    }
  }, [currentViewId, selectedAccountId])

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
          if (Array.isArray(viewData)) {
            // Old format - just widgets array
            setWidgets(viewData)
            setLayouts(defaultLayouts)
          } else if (viewData.widgets && viewData.layouts) {
            // New format - widgets and layouts
            setWidgets(viewData.widgets)
            setLayouts(viewData.layouts)
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
    setLayouts(allLayouts)
    saveViewData(undefined, allLayouts)
  }, [saveViewData])

  const handleAddWidget = useCallback((widget: WidgetConfig) => {
    // Add the new widget to the widgets array
    const newWidgets = [...widgets, widget]
    setWidgets(newWidgets)
    
    // Calculate position for new widget
    const findEmptyPosition = () => {
      const currentLayout = layouts.lg
      const maxY = Math.max(...currentLayout.map(item => item.y + item.h), 0)
      return { x: 0, y: maxY }
    }
    
    const position = findEmptyPosition()
    
    // Add layout for the new widget across all breakpoints
    const newLayouts = { ...layouts }
    
    // Determine default size based on widget type
    const getDefaultSize = (type: string) => {
      switch (type) {
        case "kpi":
          return { w: 2, h: 2, minW: 2, minH: 2 }
        case "bar":
        case "line":
        case "area":
          return { w: 3, h: 3, minW: 3, minH: 3 }
        default:
          return { w: 2, h: 2, minW: 2, minH: 2 }
      }
    }
    
    const size = getDefaultSize(widget.type)
    
    // Add to all breakpoint layouts
    newLayouts.lg.push({ i: widget.id, x: position.x, y: position.y, ...size })
    newLayouts.md.push({ i: widget.id, x: 0, y: position.y, w: widget.type === "kpi" ? 2 : 4, h: size.h, minW: size.minW, minH: size.minH })
    newLayouts.sm.push({ i: widget.id, x: 0, y: position.y, w: 6, h: size.h, minW: 6, minH: size.minH })
    
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
    // If widget has a metric, use MetricWidget component
    if (widget.metric) {
      return <MetricWidget metric={widget.metric} type={widget.type} />
    }
    
    // Otherwise render placeholder content
    switch (widget.type) {
      case "kpi":
        return (
          <div className="flex items-center justify-center h-full w-full">
            <span className="text-3xl md:text-4xl font-bold">--</span>
          </div>
        )
      case "bar":
      case "line":
      case "area":
        return (
          <div className="flex items-center justify-center h-full w-full">
            <span className="text-muted-foreground text-sm text-center">Chart visualization goes here</span>
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
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground">Loading dashboard...</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onAddWidget={handleAddWidget} />
      
      <main className="pt-16 h-screen overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {!currentViewId ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-muted-foreground">Please select or create a view to get started</span>
            </div>
          ) : (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              breakpoints={{ lg: 1280, md: 768, sm: 480 }}
              cols={{ lg: 6, md: 6, sm: 6 }}
              rowHeight={100}
              isDraggable={true}
              isResizable={true}
              containerPadding={[0, 0]}
              margin={[16, 16]}
              resizeHandles={["se"]}
              compactType={null}
              preventCollision={false}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="h-full w-full">
                  <Widget 
                    title={widget.title}
                    onRemove={() => handleRemoveWidget(widget.id)}
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