"use client";

import { Widget } from '@/components/ui/Widget';
import { useDashboardStore } from '@/lib/dashboard/store';
import { AddWidgetModal } from '@/components/dashboard/AddWidgetModal';
import { MetricWidget } from '@/components/dashboard/MetricWidget';
import { useState, useCallback } from 'react';
import { Responsive, WidthProvider, Layout as GridLayout } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardPage() {
  const { widgets, removeWidget, updateWidgetLayout } = useDashboardStore();
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleWidgetDelete = (widgetId: string) => {
    removeWidget(widgetId);
  };

  // Convert widgets to grid layout format
  const layouts = {
    lg: widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: Math.max(widget.size.w, 2), // Minimum 2 columns
      h: Math.max(widget.size.h, 2), // Minimum 2 rows
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8
    }))
  };

  const handleLayoutChange = useCallback((layout: GridLayout[]) => {
    if (isDragging) return; // Prevent updates during drag
    updateWidgetLayout(layout);
  }, [isDragging, updateWidgetLayout]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback((layout: GridLayout[]) => {
    setIsDragging(false);
    updateWidgetLayout(layout);
  }, [updateWidgetLayout]);

  return (
    <div className="min-h-screen bg-white/50 dark:bg-black/50 backdrop-blur-sm">
      {/* Content Area - Dashboard Overview */}
      <div className="pl-20 pr-8 pt-20 pb-8">
        {/* Control Bar - Now aligned to the right */}
        <div className="flex justify-end gap-3 mb-6">
          {/* Date Picker Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            <span>{dateRange}</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          {/* Add Widget Button */}
          <button 
            onClick={() => setIsAddWidgetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>Add Widget</span>
          </button>

          {/* Views Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            <span>Views</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>

        {/* Widget Grid - React Grid Layout */}
        <div className="min-h-[400px]">
          {widgets.length > 0 ? (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              onLayoutChange={handleLayoutChange}
              onDragStart={handleDragStart}
              onDragStop={handleDragStop}
              isDraggable={true}
              isResizable={true}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              useCSSTransforms={true}
            >
              {widgets.map((widget) => (
                <div key={widget.id}>
                  <Widget
                    id={widget.id}
                    onDelete={handleWidgetDelete}
                    gridBased={true}
                  >
                    <MetricWidget widget={widget} />
                  </Widget>
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : (
            /* Empty State */
            <div className="flex items-center justify-center h-64 bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <p className="text-zinc-600 dark:text-white">No widgets added yet</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Click "Add Widget" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal 
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
      />
    </div>
  );
} 