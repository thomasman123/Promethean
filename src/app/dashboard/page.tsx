"use client";

import { Sidebar } from '@/components/ui/Sidebar';
import { TopDock } from '@/components/ui/TopDock';
import { KPIWidget } from '@/components/ui/Card';
import { Widget, WidgetGrid } from '@/components/ui/Widget';
import { useDashboardStore } from '@/lib/dashboard/store';

export default function DashboardPage() {
  const { widgets, removeWidget, updateWidgetSize } = useDashboardStore();

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
    <>
      {/* Floating Sidebar */}
      <Sidebar />
      
      {/* Top Dock */}
      <TopDock />
      
      {/* Full-width Content */}
      <div className="min-h-screen bg-white">
        {/* Content Area - Dashboard Overview */}
        <div className="px-8 pt-20 pb-8">
          {/* Widget Grid */}
          <WidgetGrid>
            {widgets.map((widget) => {
              if (widget.vizType === 'kpi') {
                const metricData = mockMetricData[widget.metricName] || { value: '0' };
                return (
                  <Widget
                    key={widget.id}
                    id={widget.id}
                    onDelete={handleWidgetDelete}
                    onResize={handleWidgetResize}
                    initialWidth={widget.size.w * 250}
                    initialHeight={widget.size.h * 200}
                  >
                    <KPIWidget
                      label={widget.metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      value={metricData.value}
                      change={metricData.change}
                    />
                  </Widget>
                );
              }
              // Add other widget types (charts, etc.) here in the future
              return null;
            })}
          </WidgetGrid>

          {/* Add Widget Button */}
          {widgets.length === 0 && (
            <div className="flex items-center justify-center h-64 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <p className="text-zinc-600">No widgets added yet</p>
                <p className="text-sm text-zinc-500 mt-1">Click "Add Widget" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 