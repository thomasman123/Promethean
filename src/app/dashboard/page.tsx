"use client";

import { KPIWidget } from '@/components/ui/Card';
import { Widget } from '@/components/ui/Widget';
import { useDashboardStore } from '@/lib/dashboard/store';
import { useState } from 'react';

export default function DashboardPage() {
  const { widgets, removeWidget, updateWidgetSize } = useDashboardStore();
  const [dateRange, setDateRange] = useState('Last 30 days');

  const handleWidgetDelete = (widgetId: string) => {
    removeWidget(widgetId);
  };

  const handleWidgetResize = (widgetId: string, width: number, height: number) => {
    updateWidgetSize(widgetId, width, height);
  };

  // Map metric names to display values - in a real app this would come from the metrics engine
  const mockMetricData: Record<string, { value: string; change?: { value: string; trend: 'up' | 'down' | 'neutral' } }> = {
    'total_revenue': { value: '$124,592', change: { value: '12.5%', trend: 'up' } },
    'appointments_scheduled': { value: '142', change: { value: '8.2%', trend: 'up' } },
    'conversion_rate': { value: '23.8%', change: { value: '2.4%', trend: 'down' } },
    'active_users': { value: '89', change: { value: '5', trend: 'up' } }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Content Area - Dashboard Overview */}
      <div className="pl-20 pr-8 pt-20 pb-8">
        {/* Control Bar - Now aligned to the right */}
        <div className="flex justify-end gap-3 mb-6">
          {/* Date Picker Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            <span>{dateRange}</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          {/* Add Widget Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>Add Widget</span>
          </button>

          {/* Views Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            <span>Views</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>

        {/* Widget Grid - Proper grid system */}
        <div className="grid grid-cols-12 gap-4 auto-rows-[200px]">
          {widgets.map((widget) => {
            if (widget.vizType === 'kpi') {
              const metricData = mockMetricData[widget.metricName] || { value: '0' };
              // Calculate grid column span based on widget width
              const colSpan = Math.min(widget.size.w * 3, 12); // Each unit = 3 columns, max 12
              const rowSpan = widget.size.h; // Each unit = 1 row (200px)
              
              return (
                <div
                  key={widget.id}
                  className={`col-span-${colSpan} row-span-${rowSpan}`}
                  style={{
                    gridColumn: `span ${colSpan} / span ${colSpan}`,
                    gridRow: `span ${rowSpan} / span ${rowSpan}`
                  }}
                >
                  <Widget
                    id={widget.id}
                    onDelete={handleWidgetDelete}
                    onResize={handleWidgetResize}
                    initialWidth="100%"
                    initialHeight="100%"
                    gridBased={true}
                  >
                    <KPIWidget
                      label={widget.metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      value={metricData.value}
                      change={metricData.change}
                    />
                  </Widget>
                </div>
              );
            }
            // Add other widget types (charts, etc.) here in the future
            return null;
          })}
        </div>

        {/* Empty State */}
        {widgets.length === 0 && (
          <div className="flex items-center justify-center h-64 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <p className="text-zinc-600 dark:text-zinc-400">No widgets added yet</p>
              <p className="text-sm text-zinc-500 mt-1">Click "Add Widget" to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 