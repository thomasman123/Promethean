"use client";

import { useEffect, useState } from "react";
import { ChartWrapper, KPIChart, LineChart, BarChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { supabase } from "@/lib/supabase";

interface DashboardWidgetProps {
  widget: WidgetType;
}

// Mock data generator for demo
const generateMockData = (widget: WidgetType): MetricData => {
  const { metricName, breakdown, vizType } = widget;
  
  if (breakdown === 'total' && vizType === 'kpi') {
    return {
      metricName,
      breakdown,
      data: {
        value: Math.floor(Math.random() * 10000),
        comparison: {
          value: Math.floor(Math.random() * 40) - 20,
          type: 'percentage' as const
        }
      }
    };
  }
  
  if (breakdown === 'time' && vizType === 'line') {
    const days = 30;
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString(),
        value: Math.floor(Math.random() * 1000) + 500
      };
    });
    return { metricName, breakdown, data };
  }
  
  if ((breakdown === 'rep' || breakdown === 'setter') && vizType === 'bar') {
    const entities = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
    const data = entities.map(name => ({
      name,
      value: Math.floor(Math.random() * 5000) + 1000
    }));
    return { metricName, breakdown, data };
  }
  
  // Default fallback
  return { metricName, breakdown, data: {} };
};

export function DashboardWidget({ widget }: DashboardWidgetProps) {
  const [data, setData] = useState<MetricData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  
  const { 
    filters, 
    compareMode, 
    compareEntities,
    updateWidget,
    removeWidget,
    duplicateWidget,
    metricsRegistry 
  } = useDashboardStore();
  
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // TODO: Replace with actual API call
        // const supabase = createClient();
        // const response = await fetch('/api/metrics', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     metricName: widget.metricName,
        //     breakdown: widget.breakdown,
        //     filters,
        //     compareMode,
        //     compareEntities
        //   })
        // });
        
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData = generateMockData(widget);
        setData(mockData);
        setError(undefined);
      } catch (err) {
        setError('Failed to load metric data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [widget, filters, compareMode, compareEntities]);
  
  const renderChart = () => {
    if (!data) return null;
    
    switch (widget.vizType) {
      case 'kpi':
        return (
          <KPIChart
            value={data.data.value}
            unit={metricDefinition?.unit}
            comparison={data.data.comparison}
          />
        );
        
      case 'line':
        return (
          <LineChart
            data={data.data}
            lines={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="date"
            xAxisType="date"
            showLegend={false}
          />
        );
        
      case 'bar':
        return (
          <BarChart
            data={data.data}
            bars={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="name"
            showLegend={false}
          />
        );
        
      default:
        return <div>Unsupported visualization type: {widget.vizType}</div>;
    }
  };
  
  return (
    <ChartWrapper
      title={widget.settings?.title || metricDefinition?.displayName || widget.metricName}
      description={metricDefinition?.description}
      formula={metricDefinition?.formula}
      isLoading={isLoading}
      error={error}
      pinned={widget.pinned}
      onEdit={() => console.log('Edit widget:', widget.id)}
      onDuplicate={() => duplicateWidget(widget.id)}
      onDelete={() => removeWidget(widget.id)}
      onPin={() => updateWidget(widget.id, { pinned: !widget.pinned })}
    >
      {renderChart()}
    </ChartWrapper>
  );
} 