"use client";

import { Responsive, WidthProvider } from "react-grid-layout";
import { DashboardWidget } from "./dashboard-widget";
import { useDashboardStore } from "@/lib/dashboard/store";
import { GridLayout } from "@/lib/dashboard/types";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  className?: string;
}

export function DashboardGrid({ className }: DashboardGridProps) {
  const { widgets, updateWidgetLayout } = useDashboardStore();
  
  // Convert widgets to grid layout format
  const layouts = {
    lg: widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.size.w,
      h: widget.size.h,
      minW: 2,
      minH: 2,
      maxW: 12,
      static: widget.pinned
    }))
  };
  
  const handleLayoutChange = (layout: GridLayout[]) => {
    updateWidgetLayout(layout);
  };
  
  return (
    <div className={className}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={true}
        isResizable={true}
        containerPadding={[16, 16]}
        margin={[16, 16]}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map(widget => (
          <div key={widget.id}>
            <DashboardWidget widget={widget} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
} 