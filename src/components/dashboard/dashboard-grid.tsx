"use client";

import { Responsive, WidthProvider } from "react-grid-layout";
import { useState } from "react";
import { DashboardWidget } from "./dashboard-widget";
import { useDashboardStore } from "@/lib/dashboard/store";
import { GridLayout } from "@/lib/dashboard/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  className?: string;
}

export function DashboardGrid({ className }: DashboardGridProps) {
  const { widgets, updateWidgetLayout } = useDashboardStore();
  const [isDragging, setIsDragging] = useState(false);
  
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
    // No-op during active drag/resize to avoid excessive re-renders
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (layout: GridLayout[]) => {
    setIsDragging(false);
    updateWidgetLayout(layout);
  };

  const handleResizeStart = () => {
    setIsDragging(true);
  };

  const handleResizeStop = (layout: GridLayout[]) => {
    setIsDragging(false);
    updateWidgetLayout(layout);
  };
  
  return (
    <div className={className}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
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
            <DashboardWidget widget={widget} isDragging={isDragging} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
} 