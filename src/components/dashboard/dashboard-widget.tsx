"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ChartWrapper, KPIChart, LineChart, BarChart, AreaChart, PieChart, DonutChart, TableChart } from "./charts";
import { CompareWidget } from "./compare-widget";
import { WidgetDetailModal } from "./widget-detail-modal";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { supabase } from "@/lib/supabase";

interface DashboardWidgetProps {
  widget: WidgetType;
  isDragging?: boolean;
}

// Generate colors for compare mode
const COMPARE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
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
  
  if (breakdown === 'time' && (vizType === 'line' || vizType === 'area' || vizType === 'sparkline')) {
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
  
  if ((breakdown === 'rep' || breakdown === 'setter') && (vizType === 'bar' || vizType === 'horizontalBar' || vizType === 'stackedBar' || vizType === 'pie' || vizType === 'donut' || vizType === 'table' || vizType === 'radialBar')) {
    // If compare mode, show comparison between selected entities
    if (compareEntities && compareEntities.length > 0) {
      const data = compareEntities.map(entity => ({
        name: entity.name,
        value: Math.floor(Math.random() * 5000) + 1000
      }));
      if (vizType === 'stackedBar') {
        return { metricName, breakdown, data: data.map(d => ({ ...d, value2: Math.floor(Math.random() * 4000) + 500 })) };
      }
      return { metricName, breakdown, data };
    }
    
    // Default behavior
    const entities = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
    const data = entities.map(name => ({
      name,
      value: Math.floor(Math.random() * 5000) + 1000
    }));
    if (vizType === 'stackedBar') {
      return { metricName, breakdown, data: data.map(d => ({ ...d, value2: Math.floor(Math.random() * 4000) + 500 })) };
    }
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
  if ((vizType === 'pie' || vizType === 'donut' || vizType === 'radialBar') && (breakdown === 'rep' || breakdown === 'setter')) {
    const categories = breakdown === 'rep' 
      ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams']
      : ['Charlie Brown', 'David Lee', 'Emma Wilson', 'Frank Miller'];
    
    const data = categories.map(name => ({
      name,
      value: Math.floor(Math.random() * 5000) + 1000
    }));
    
    return { metricName, breakdown, data };
  }
  
  // Table data
  if (vizType === 'table' && (breakdown === 'rep' || breakdown === 'setter')) {
    const entities = breakdown === 'rep' 
      ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown']
      : ['Charlie Brown', 'David Lee', 'Emma Wilson', 'Frank Miller', 'George White'];
    
    const data = entities.map(name => {
      const revenue = Math.floor(Math.random() * 50000) + 10000;
      const appointments = Math.floor(Math.random() * 100) + 20;
      const showRate = 60 + Math.random() * 35;
      const closeRate = 15 + Math.random() * 25;
      const trend = Math.floor(Math.random() * 40) - 20;
      
      return {
        name,
        revenue,
        appointments,
        showRate,
        closeRate,
        avgDeal: revenue / appointments,
        trend,
        sparkline: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 50)
      };
    });
    
    return { metricName, breakdown, data };
  }
  
  // Default fallback
  return { metricName, breakdown, data: {} };
};

export function DashboardWidget({ widget, isDragging }: DashboardWidgetProps) {
  const [data, setData] = useState<MetricData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const { 
    filters, 
    compareMode, 
    compareEntities,
    compareModeSettings,
    updateWidget,
    removeWidget,
    duplicateWidget,
    metricsRegistry 
  } = useDashboardStore();
  
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);
  
  // Special handling for compare mode widgets
  if (widget.vizType === 'compareMatrix' || widget.vizType === 'compareTable') {
    return <CompareWidget widgetId={widget.id} />;
  }
  
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
  
  // Memoize chart rendering to prevent unnecessary re-renders during drag
  const renderChart = useCallback(() => {
    if (!data) return null;
    
    // Create a stable key for chart components to prevent unnecessary remounting
    const chartKey = `chart-${widget.id}-${widget.vizType}-${isDragging ? 'dragging' : 'static'}`;
    
    switch (widget.vizType) {
      case 'kpi':
        return (
          <KPIChart
            key={chartKey}
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
              key={chartKey}
              data={data.data}
              lines={lines}
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
              disableTooltip={isDragging}
            />
          );
        }
        
        // Single series
        return (
          <LineChart
            key={chartKey}
            data={data.data}
            lines={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="date"
            xAxisType="date"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );
        
      case 'bar':
        // Compare mode changes the data structure
        if (compareMode && relevantEntities.length > 0) {
          return (
            <BarChart
              key={chartKey}
              data={data.data}
              bars={[{
                dataKey: 'value',
                name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              showLegend={false}
              disableTooltip={isDragging}
            />
          );
        }
        
        return (
          <BarChart
            key={chartKey}
            data={data.data}
            bars={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="name"
            showLegend={false}
            disableTooltip={isDragging}
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
              key={chartKey}
              data={data.data}
              areas={areas}
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
              stacked={true}
              disableTooltip={isDragging}
            />
          );
        }
        
        // Single series
        return (
          <AreaChart
            key={chartKey}
            data={data.data}
            areas={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="date"
            xAxisType="date"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );
        
      case 'pie':
        return (
          <PieChart
            key={chartKey}
            data={data.data}
            showLegend={true}
            showLabels={true}
            disableTooltip={isDragging}
          />
        );
        
      case 'donut':
        return (
          <DonutChart
            key={chartKey}
            data={data.data}
            showLegend={true}
            showLabels={true}
            disableTooltip={isDragging}
          />
        );

      case 'horizontalBar':
        return (
          <BarChart
            key={chartKey}
            data={data.data}
            bars={[{ dataKey: 'value', name: widget.settings?.title || widget.metricName, color: 'hsl(var(--primary))' }]}
            xAxisKey="name"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );

      case 'stackedBar':
        // Derive a simple two-series mock for now if not present
        return (
          <BarChart
            key={chartKey}
            data={data.data}
            bars={[
              { dataKey: 'value', name: 'A', color: 'hsl(var(--primary))' },
              { dataKey: 'value2', name: 'B', color: 'hsl(215 70% 50%)' },
            ]}
            xAxisKey="name"
            showLegend={true}
            stacked={true}
            disableTooltip={isDragging}
          />
        );

      case 'sparkline':
        return (
          <AreaChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data.map((d: any) => ({ date: d.date || d.name, value: d.value })) : []}
            areas={[{ dataKey: 'value', name: 'Value', color: 'hsl(var(--primary))' }]}
            xAxisKey="date"
            xAxisType="category"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );
 
      case 'table':
        const columns = [
          { key: 'name', label: 'Name' },
          { key: 'revenue', label: 'Revenue', type: 'currency' as const, align: 'right' as const },
          { key: 'appointments', label: 'Appointments', type: 'number' as const, align: 'center' as const },
          { key: 'showRate', label: 'Show Rate', type: 'percentage' as const, align: 'center' as const },
          { key: 'closeRate', label: 'Close Rate', type: 'percentage' as const, align: 'center' as const },
          { key: 'avgDeal', label: 'Avg Deal', type: 'currency' as const, align: 'right' as const },
          { key: 'trend', label: 'Trend', type: 'trend' as const, align: 'center' as const },
          { key: 'sparkline', label: 'Last 7 Days', type: 'sparkline' as const, align: 'center' as const }
        ];
        
        return (
          <TableChart
            key={chartKey}
            data={data.data}
            columns={columns}
            showRowNumbers={true}
            striped={true}
            hoverable={true}
          />
        );
        
      default:
        return <div>Unsupported visualization type: {widget.vizType}</div>;
    }
  }, [data, widget.id, widget.vizType, widget.settings, metricDefinition, isDragging, compareMode, relevantEntities]);
  
  return (
    <>
      <div 
        className="cursor-pointer"
        onClick={() => setShowDetailModal(true)}
      >
        <ChartWrapper
          title={widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          description={metricDefinition?.description}
          formula={metricDefinition?.formula}
          isLoading={isLoading}
          error={error}
          pinned={widget.pinned}
          compareMode={compareMode && relevantEntities.length > 0}
          compareEntities={relevantEntities.length}
          onEdit={() => console.log('Edit widget:', widget.id)}
          onDuplicate={() => duplicateWidget(widget.id)}
          onDelete={() => removeWidget(widget.id)}
          onPin={() => updateWidget(widget.id, { pinned: !widget.pinned })}
        >
          {isDragging ? (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded">
              <div className="text-sm text-muted-foreground">Moving...</div>
            </div>
          ) : (
            <div key={`widget-content-${widget.id}`}>
              {renderChart()}
            </div>
          )}
        </ChartWrapper>
      </div>
      
      {data && (
        <WidgetDetailModal
          widget={widget}
          data={data}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />
      )}
    </>
  );
} 