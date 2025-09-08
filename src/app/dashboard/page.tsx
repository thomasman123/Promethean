"use client"

import { useState, useCallback } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import { TopBar } from "@/components/layout/topbar"
import { Widget } from "@/components/dashboard/widget"
import { WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Initial sample widgets
const initialWidgets: WidgetConfig[] = [
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

// Default layouts for different breakpoints
const defaultLayouts = {
  lg: [
    { i: "widget-1", x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "widget-2", x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "widget-3", x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "widget-4", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "widget-5", x: 0, y: 3, w: 6, h: 4, minW: 3, minH: 3 },
    { i: "widget-6", x: 6, y: 3, w: 6, h: 4, minW: 3, minH: 3 },
    { i: "widget-7", x: 0, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "widget-8", x: 4, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "widget-9", x: 8, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
  ],
  md: [
    { i: "widget-1", x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "widget-2", x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "widget-3", x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "widget-4", x: 0, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "widget-5", x: 4, y: 3, w: 8, h: 4, minW: 4, minH: 3 },
    { i: "widget-6", x: 0, y: 7, w: 12, h: 4, minW: 4, minH: 3 },
    { i: "widget-7", x: 0, y: 11, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "widget-8", x: 6, y: 11, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "widget-9", x: 0, y: 14, w: 12, h: 3, minW: 4, minH: 2 },
  ],
  sm: [
    { i: "widget-1", x: 0, y: 0, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-2", x: 0, y: 3, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-3", x: 0, y: 6, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-4", x: 0, y: 9, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-5", x: 0, y: 12, w: 12, h: 4, minW: 12, minH: 3 },
    { i: "widget-6", x: 0, y: 16, w: 12, h: 4, minW: 12, minH: 3 },
    { i: "widget-7", x: 0, y: 20, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-8", x: 0, y: 23, w: 12, h: 3, minW: 12, minH: 2 },
    { i: "widget-9", x: 0, y: 26, w: 12, h: 3, minW: 12, minH: 2 },
  ],
}

export default function DashboardPage() {
  const { selectedAccountId, currentViewId } = useDashboard()
  const [layouts, setLayouts] = useState(defaultLayouts)
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets)

  const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts)
    // Here you could save the layouts to localStorage or a database
  }, [])

  const handleAddWidget = (widget: WidgetConfig) => {
    // Add the new widget to the widgets array
    setWidgets(prev => [...prev, widget])
    
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
          return { w: 3, h: 3, minW: 2, minH: 2 }
        case "bar":
        case "line":
        case "area":
          return { w: 6, h: 4, minW: 3, minH: 3 }
        default:
          return { w: 3, h: 3, minW: 2, minH: 2 }
      }
    }
    
    const size = getDefaultSize(widget.type)
    
    // Add to all breakpoint layouts
    newLayouts.lg.push({ i: widget.id, x: position.x, y: position.y, ...size })
    newLayouts.md.push({ i: widget.id, x: 0, y: position.y, w: widget.type === "kpi" ? 6 : 12, h: size.h, minW: size.minW, minH: size.minH })
    newLayouts.sm.push({ i: widget.id, x: 0, y: position.y, w: 12, h: size.h, minW: 12, minH: size.minH })
    
    setLayouts(newLayouts)
  }

  const renderWidgetContent = (widget: WidgetConfig) => {
    // Get metric info if available
    const metricInfo = widget.metric ? METRICS_REGISTRY[widget.metric] : null
    
    // Sample content based on widget type
    switch (widget.type) {
      case "kpi":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-4xl font-bold">
              {metricInfo && metricInfo.unit === 'currency' && '$'}
              --
              {metricInfo && metricInfo.unit === 'percent' && '%'}
            </span>
            <span className="text-sm text-muted-foreground mt-2">
              {metricInfo ? metricInfo.description : 'No data'}
            </span>
          </div>
        )
      case "bar":
      case "line":
      case "area":
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground">
              {metricInfo ? `${metricInfo.name} chart visualization` : 'Chart visualization goes here'}
            </span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onAddWidget={handleAddWidget} />
      
      <main className="pt-16 h-screen overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8">
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1280, md: 768, sm: 480 }}
            cols={{ lg: 12, md: 12, sm: 12 }}
            rowHeight={80}
            isDraggable={true}
            isResizable={true}
            containerPadding={[0, 0]}
            margin={[20, 20]}
            resizeHandles={["se", "sw", "ne", "nw"]}
          >
            {widgets.map((widget) => (
              <div key={widget.id}>
                <Widget title={widget.title}>
                  {renderWidgetContent(widget)}
                </Widget>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </main>
    </div>
  )
} 