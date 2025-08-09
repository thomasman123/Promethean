"use client";

import { useEffect, useState } from "react";
import { ChartWrapper, KPIChart, LineChart, BarChart, AreaChart, PieChart, DonutChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { supabase } from "@/lib/supabase";

interface DashboardWidgetProps {
  widget: WidgetType;
}

// Generate colors for compare mode
const COMPARE_COLORS = [
  'hsl(var(--primary))',
  'hsl(346, 84%, 61%)', // Red
  'hsl(142, 71%, 45%)', // Green  
  'hsl(215, 70%, 50%)', // Blue
  'hsl(47, 85%, 63%)',  // Yellow
  'hsl(280, 70%, 50%)', // Purple
];

// Mock data generator for demo
const generateMockData = (widget: WidgetType, compareEntities?: any[]): MetricData => {
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
    const baseData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString(),
        value: Math.floor(Math.random() * 1000) + 500
      };
    });
    
    // If compare mode, generate data for each entity
    if (compareEntities && compareEntities.length > 0) {
      const compareData = baseData.map(point => {
        const dataPoint: any = { date: point.date };
        compareEntities.forEach(entity => {
          dataPoint[entity.id] = Math.floor(Math.random() * 1000) + 500;
        });
        return dataPoint;
      });
      return { metricName, breakdown, data: compareData };
    }
    
    return { metricName, breakdown, data: baseData };
  }
  
  if ((breakdown === 'rep' || breakdown === 'setter') && vizType === 'bar') {
    // If compare mode, show comparison between selected entities
    if (compareEntities && compareEntities.length > 0) {
      const data = compareEntities.map(entity => ({
        name: entity.name,
        value: Math.floor(Math.random() * 5000) + 1000
      }));
      return { metricName, breakdown, data };
    }
    
    // Default behavior
    const entities = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
    const data = entities.map(name => ({
      name,
      value: Math.floor(Math.random() * 5000) + 1000
    }));
    return { metricName, breakdown, data };
  }
  
  // Area chart data (similar to line)
  if (breakdown === 'time' && vizType === 'area') {
    const days = 30;
    const baseData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString(),
        value: Math.floor(Math.random() * 1000) + 500
      };
    });
    
    // If compare mode, generate data for each entity
    if (compareEntities && compareEntities.length > 0) {
      const compareData = baseData.map(point => {
        const dataPoint: any = { date: point.date };
        compareEntities.forEach(entity => {
          dataPoint[entity.id] = Math.floor(Math.random() * 1000) + 500;
        });
        return dataPoint;
      });
      return { metricName, breakdown, data: compareData };
    }
    
    return { metricName, breakdown, data: baseData };
  }
  
  // Pie/Donut chart data
  if ((vizType === 'pie' || vizType === 'donut') && (breakdown === 'rep' || breakdown === 'setter')) {
    const categories = breakdown === 'rep' 
      ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams']
      : ['Charlie Brown', 'David Lee', 'Emma Wilson', 'Frank Miller'];
    
    const data = categories.map(name => ({
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
  
  // Filter entities based on widget breakdown type
  const relevantEntities = compareMode 
    ? compareEntities.filter(e => {
        if (widget.breakdown === 'rep') return e.type === 'rep';
        if (widget.breakdown === 'setter') return e.type === 'setter';
        if (widget.breakdown === 'link') return true; // Both types
        return false;
      })
    : [];
  
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
        //     compareEntities: relevantEntities
        //   })
        // });
        
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData = generateMockData(widget, relevantEntities);
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
  }, [widget, filters, compareMode, relevantEntities]);
  
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
        // Multi-series for compare mode
        if (compareMode && relevantEntities.length > 0) {
          const lines = relevantEntities.map((entity, index) => ({
            dataKey: entity.id,
            name: entity.name,
            color: entity.color || COMPARE_COLORS[index % COMPARE_COLORS.length]
          }));
          
          return (
            <LineChart
              data={data.data}
              lines={lines}
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
            />
          );
        }
        
        // Single series
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
        // Compare mode changes the data structure
        if (compareMode && relevantEntities.length > 0) {
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
        }
        
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
        
      case 'area':
        // Multi-series for compare mode
        if (compareMode && relevantEntities.length > 0) {
          const areas = relevantEntities.map((entity, index) => ({
            dataKey: entity.id,
            name: entity.name,
            color: entity.color || COMPARE_COLORS[index % COMPARE_COLORS.length]
          }));
          
          return (
            <AreaChart
              data={data.data}
              areas={areas}
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
              stacked={true}
            />
          );
        }
        
        // Single series
        return (
          <AreaChart
            data={data.data}
            areas={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="date"
            xAxisType="date"
            showLegend={false}
          />
        );
        
      case 'pie':
        return (
          <PieChart
            data={data.data}
            showLegend={true}
            showLabels={true}
          />
        );
        
      case 'donut':
        return (
          <DonutChart
            data={data.data}
            showLegend={true}
            showLabels={true}
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