"use client"

import { useState, useCallback } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import { TopBar } from "@/components/layout/topbar"
import { Widget } from "@/components/dashboard/widget"
import { useDashboard } from "@/lib/dashboard-context"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Default layouts for different breakpoints
const defaultLayouts = {
  lg: [
    { i: "widget-1", x: 0, y: 0, w: 3, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-2", x: 3, y: 0, w: 3, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-3", x: 6, y: 0, w: 3, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-4", x: 9, y: 0, w: 3, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-5", x: 0, y: 4, w: 6, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-6", x: 6, y: 4, w: 6, h: 4, minW: 2.4, minH: 3 },
  ],
  md: [
    { i: "widget-1", x: 0, y: 0, w: 6, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-2", x: 6, y: 0, w: 6, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-3", x: 0, y: 4, w: 6, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-4", x: 6, y: 4, w: 6, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-5", x: 0, y: 8, w: 12, h: 4, minW: 2.4, minH: 3 },
    { i: "widget-6", x: 0, y: 12, w: 12, h: 4, minW: 2.4, minH: 3 },
  ],
  sm: [
    { i: "widget-1", x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "widget-2", x: 0, y: 4, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "widget-3", x: 0, y: 8, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "widget-4", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "widget-5", x: 0, y: 16, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "widget-6", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 3 },
  ],
}

export default function DashboardPage() {
  const { selectedAccountId, currentViewId } = useDashboard()
  const [layouts, setLayouts] = useState(defaultLayouts)

  const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts)
    // Here you could save the layouts to localStorage or a database
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16 h-screen overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8">
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1280, md: 768, sm: 480 }}
            cols={{ lg: 12, md: 12, sm: 12 }}
            rowHeight={60}
            isDraggable={true}
            isResizable={true}
            containerPadding={[0, 0]}
            margin={[16, 16]}
            resizeHandles={["se", "sw", "ne", "nw"]}
          >
            <div key="widget-1">
              <Widget title="Total Appointments">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-4xl font-bold">124</span>
                  <span className="text-sm text-muted-foreground mt-2">This month</span>
                </div>
              </Widget>
            </div>
            
            <div key="widget-2">
              <Widget title="Show Rate">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-4xl font-bold">68%</span>
                  <span className="text-sm text-muted-foreground mt-2">+5% from last month</span>
                </div>
              </Widget>
            </div>
            
            <div key="widget-3">
              <Widget title="Answer Rate">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-4xl font-bold">42%</span>
                  <span className="text-sm text-muted-foreground mt-2">Last 30 days</span>
                </div>
              </Widget>
            </div>
            
            <div key="widget-4">
              <Widget title="Speed to Lead">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-4xl font-bold">2.3m</span>
                  <span className="text-sm text-muted-foreground mt-2">Average response time</span>
                </div>
              </Widget>
            </div>
            
            <div key="widget-5">
              <Widget title="Performance Overview">
                <div className="flex items-center justify-center h-full">
                  <span className="text-muted-foreground">Chart visualization goes here</span>
                </div>
              </Widget>
            </div>
            
            <div key="widget-6">
              <Widget title="Recent Activity">
                <div className="flex items-center justify-center h-full">
                  <span className="text-muted-foreground">Activity feed goes here</span>
                </div>
              </Widget>
            </div>
          </ResponsiveGridLayout>
        </div>
      </main>
    </div>
  )
} 