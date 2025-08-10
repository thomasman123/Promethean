"use client";

import { Responsive, WidthProvider } from "react-grid-layout";
import { useState, useCallback, useRef } from "react";
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
  const [rowHeight, setRowHeight] = useState<number>(60);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Convert widgets to grid layout format
  const layouts = {
    lg: widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.size.w,
      h: widget.size.h,
      minW: 3,
      minH: 3,
      maxW: 12,
      static: widget.pinned
    }))
  };
  
  const computeRowHeight = useCallback((width: number, cols: number, marginX: number, containerPaddingX: number) => {
    const colWidth = (width - (cols - 1) * marginX - 2 * containerPaddingX) / cols;
    return Math.max(40, Math.floor(colWidth));
  }, []);

  const handleLayoutChange = useCallback((layout: GridLayout[]) => {
    // No-op during active drag/resize to avoid excessive re-renders
    // Layout updates are handled in drag/resize stop events
  }, []);

  const handleWidthChange = useCallback((width: number, margin: [number, number], cols: number) => {
    const next = computeRowHeight(width, cols, margin[0], 16);
    setRowHeight(next);
  }, [computeRowHeight]);

  const handleDragStart = useCallback(() => {
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback((layout: GridLayout[]) => {
    // Debounce the drag stop to prevent rapid state changes
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
      updateWidgetLayout(layout);
      // Nudge chart libraries that listen to window resize
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, 100); // Small delay to ensure smooth transition
  }, [updateWidgetLayout]);

  const handleResizeStart = useCallback(() => {
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    setIsDragging(true);
  }, []);

  const handleResize = useCallback(() => {
    // Continuously notify while resizing so responsive charts re-measure
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }
  }, []);

  const handleResizeStop = useCallback((layout: GridLayout[]) => {
    // Debounce the resize stop to prevent rapid state changes
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
      updateWidgetLayout(layout);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, 100); // Small delay to ensure smooth transition
  }, [updateWidgetLayout]);
  
  return (
    <div className={className}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onWidthChange={handleWidthChange}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={rowHeight}
        isDraggable={true}
        isResizable={true}
        containerPadding={[16, 16]}
        margin={[16, 16]}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map(widget => (
          <div key={widget.id} className="h-full min-h-0 overflow-hidden">
            <DashboardWidget widget={widget} isDragging={isDragging} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
} 