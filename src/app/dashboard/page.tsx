"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import { TopBar } from "@/components/layout/topbar"
import { LayoutWrapper, useLayout } from "@/components/layout/layout-wrapper"
import { Widget } from "@/components/dashboard/widget"
import { MetricWidget } from "@/components/dashboard/metric-widget"
import { WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { EditWidgetModal } from "@/components/dashboard/edit-widget-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Loading } from "@/components/ui/loading"
import { Button } from "@/components/ui/button"

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

function DashboardContent() {
  const { selectedAccountId, currentViewId, setCurrentViewId } = useDashboard()
  const { isModern } = useLayout()
  const [layouts, setLayouts] = useState(defaultLayouts)
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fix hydration by ensuring client-side only rendering for localStorage access
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load saved view from localStorage on mount (client-side only)
  useEffect(() => {
    if (isClient) {
      const savedViewId = localStorage.getItem('lastSelectedViewId')
      if (savedViewId && !currentViewId) {
        console.log('🔍 [Dashboard] Loading saved view ID from localStorage:', savedViewId)
        setCurrentViewId(savedViewId)
      }
    }
  }, [isClient, currentViewId, setCurrentViewId])

  // Save current view to localStorage when it changes (client-side only)
  useEffect(() => {
    if (isClient && currentViewId) {
      console.log('🔍 [Dashboard] Saving view ID to localStorage:', currentViewId)
      localStorage.setItem('lastSelectedViewId', currentViewId)
    }
  }, [isClient, currentViewId])

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
    console.log('🔍 [Dashboard] Dependencies check - accountsLoaded:', accountsLoaded, 'currentViewId:', currentViewId || '<empty string>', 'selectedAccountId:', selectedAccountId || '<empty string>')
    
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
      console.log('🔍 [Dashboard] Loading view data for currentViewId:', currentViewId)
      const response = await fetch(`/api/dashboard/views?accountId=${selectedAccountId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 [Dashboard] Fetched views data:', data.views?.length, 'views')
        const currentView = data.views?.find((v: any) => v.id === currentViewId)
        console.log('🔍 [Dashboard] Found current view:', currentView?.name, 'with widgets:', currentView?.widgets ? 'present' : 'missing')
        
        if (currentView && currentView.widgets) {
          // Load widgets and layouts from the view
          const viewData = currentView.widgets as ViewData
          console.log('🔍 [Dashboard] ViewData structure:', typeof viewData, Array.isArray(viewData) ? 'array' : 'object')
          console.log('🔍 [Dashboard] Full viewData:', JSON.stringify(viewData, null, 2))
          
          if (Array.isArray(viewData)) {
            // Old format - just widgets array
            console.log('🔍 [Dashboard] Loading old format widgets:', viewData.length, 'widgets')
            const loadedWidgets = viewData
            let loadedLayouts = JSON.parse(JSON.stringify(defaultLayouts))
            
            // Generate layouts for existing widgets if they don't have layouts
            const lgLayout = loadedWidgets.map((widget, index) => ({
              i: widget.id,
              x: (index % 3) * 4,
              y: Math.floor(index / 3) * 4,
              w: 4,
              h: 4,
              minW: 3,
              minH: 3,
            }))
            
            loadedLayouts = {
              lg: lgLayout,
              md: lgLayout,
              sm: lgLayout.map(item => ({ ...item, w: 6, x: (item.x || 0) >= 6 ? 0 : item.x })),
            }
            
            setWidgets(loadedWidgets)
            setLayouts(loadedLayouts)
            console.log('✅ [Dashboard] Loaded old format:', loadedWidgets.length, 'widgets')
          } else if (viewData && viewData.widgets && viewData.layouts) {
            // New format - widgets and layouts object
            console.log('🔍 [Dashboard] Loading new format widgets:', viewData.widgets.length, 'widgets')
            setWidgets(viewData.widgets)
            setLayouts(viewData.layouts)
            console.log('✅ [Dashboard] Loaded new format:', viewData.widgets.length, 'widgets')
          } else {
            // No saved data, use defaults
            console.log('⚠️ [Dashboard] ViewData exists but no widgets/layouts found, using defaults')
            setWidgets(defaultWidgets)
            setLayouts(defaultLayouts)
          }
        } else {
          // No view found or no widgets, use defaults
          console.log('⚠️ [Dashboard] No view found or no widgets, using defaults')
          setWidgets(defaultWidgets)
          setLayouts(defaultLayouts)
        }
      } else {
        console.error("❌ [Dashboard] Failed to load dashboard views, status:", response.status)
        setWidgets(defaultWidgets)
        setLayouts(defaultLayouts)
      }
    } catch (error) {
      console.error("❌ [Dashboard] Error loading dashboard views:", error)
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

  const handleEditWidget = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (widget) {
      console.log('🔧 [Dashboard] Opening edit modal for widget:', widget)
      setEditingWidget(widget)
      setIsEditModalOpen(true)
    }
  }, [widgets])

  const handleSaveEditedWidget = useCallback((updatedWidget: WidgetConfig) => {
    console.log('💾 [Dashboard] Saving edited widget:', updatedWidget)
    const newWidgets = widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w)
    setWidgets(newWidgets)
    saveViewData(newWidgets, layouts)
    setEditingWidget(null)
    setIsEditModalOpen(false)
  }, [widgets, layouts, saveViewData])

  const renderWidgetContent = (widget: WidgetConfig) => {
    // For KPI widgets with single metric
    if (widget.type === "kpi" && widget.metric) {
      return <MetricWidget metric={widget.metric} type={widget.type} options={widget.metricOptions} />
    }
    
    // For chart widgets with multiple metrics
    if ((widget.type === "bar" || widget.type === "line" || widget.type === "area") && widget.metrics) {
      return <MetricWidget metrics={widget.metrics} type={widget.type} options={widget.metricsOptions} />
    }
    
    // For data view widgets with multiple metrics and selected users
    if (widget.type === "data" && widget.metrics && widget.selectedUsers) {
      return <MetricWidget metrics={widget.metrics} type={widget.type} options={widget.metricsOptions} selectedUsers={widget.selectedUsers} />
    }
    
    // For backward compatibility - chart with single metric
    if ((widget.type === "bar" || widget.type === "line" || widget.type === "area") && widget.metric) {
      return <MetricWidget metrics={[widget.metric]} type={widget.type} options={widget.metricOptions} />
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
      case "data":
        return (
          <div className="h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Data view</span>
          </div>
        )
      default:
        return null
    }
  }

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <>
        {!isModern && <TopBar onAddWidget={handleAddWidget} />}
        <main className={isModern ? "" : "pt-16 h-screen overflow-y-auto"}>
          <Loading text="Loading..." />
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        {!isModern && <TopBar onAddWidget={handleAddWidget} />}
        <main className={isModern ? "" : "pt-16 h-screen overflow-y-auto"}>
          <Loading text="Loading dashboard..." />
        </main>
      </>
    )
  }

  return (
    <>
      {!isModern && <TopBar onAddWidget={handleAddWidget} />}
      
      <main className={isModern ? "" : "pt-16 h-screen overflow-y-auto"}>
        <div className={isModern ? "page-fade-in" : "p-6"}>
          <div className="mb-4" />
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
                    onEdit={() => handleEditWidget(widget.id)}
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

      {/* Edit Widget Modal */}
      <EditWidgetModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSaveWidget={handleSaveEditedWidget}
        widget={editingWidget}
      />
    </>
  )
}

export default function DashboardPage() {
  return (
    <LayoutWrapper>
      <DashboardContent />
    </LayoutWrapper>
  )
} 