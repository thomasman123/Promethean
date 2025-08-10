"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  ChartWrapper, 
  KPIChart, 
  LineChart, 
  BarChart, 
  AreaChart, 
  PieChart, 
  DonutChart, 
  TableChart,
  HorizontalBarChart,
  StackedBarChart,
  ScatterChart,
  RadarChart,
  RadialBarChart,
  SparklineChart
} from "./charts";
import { CompareWidget } from "./compare-widget";
import { WidgetDetailModal } from "./widget-detail-modal";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { useAuth } from "@/hooks/useAuth";
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
  
  const { selectedAccountId } = useAuth();
  
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);
  
  // Special handling for compare mode widgets
  if (widget.vizType === 'compareMatrix' || widget.vizType === 'compareTable') {
    return <CompareWidget widgetId={widget.id} />;
  }
  
  // Memoize relevant entities to prevent useEffect infinite loop
  const relevantEntities = useMemo(() => {
    if (!compareMode) return [];
    
    return compareEntities.filter(e => {
      if (widget.breakdown === 'rep') return e.type === 'rep';
      if (widget.breakdown === 'setter') return e.type === 'setter';
      if (widget.breakdown === 'link') return true; // Both types
      return false;
    });
  }, [compareMode, compareEntities, widget.breakdown]);
  
  // Memoize widget key properties to prevent unnecessary re-fetches
  const widgetKey = useMemo(() => ({
    id: widget.id,
    metricName: widget.metricName,
    breakdown: widget.breakdown,
    vizType: widget.vizType
  }), [widget.id, widget.metricName, widget.breakdown, widget.vizType]);
  
  // Memoize filters to prevent reference instability
  const stableFilters = useMemo(() => JSON.stringify(filters), [filters]);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(undefined);
      
      try {
        // Wait for account selection before fetching data
        if (!selectedAccountId) {
          setIsLoading(false);
          return;
        }

        const { filters: globalFilters } = useDashboardStore.getState();

        // Prepare filters for metrics API
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const metricsFilters = {
          dateRange: {
            start: globalFilters.startDate || thirtyDaysAgo.toISOString(),
            end: globalFilters.endDate || now.toISOString()
          },
          accountId: selectedAccountId,
          repIds: globalFilters.repIds,
          setterIds: globalFilters.setterIds
        };

        // Map dashboard metric names to engine metric names
        const getEngineMetricName = (dashboardMetricName: string, breakdown: string) => {
          // Map common dashboard metrics to engine metrics
          if (dashboardMetricName.includes('appointment')) {
            if (breakdown === 'total') return 'total_appointments';
            if (breakdown === 'rep') return 'total_appointments_reps'; 
            if (breakdown === 'setter') return 'total_appointments_setters';
            if (breakdown === 'link') return 'appointments_link';
          }
          if (dashboardMetricName.includes('show_rate')) {
            if (breakdown === 'rep') return 'show_rate_reps';
            if (breakdown === 'setter') return 'show_rate_setters';
          }
          
          // Default fallback - use the metric name as-is
          return dashboardMetricName;
        };

        const engineMetricName = getEngineMetricName(widgetKey.metricName, widgetKey.breakdown);
        
        // Call the metrics API
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metricName: engineMetricName,
            filters: metricsFilters
          }),
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }

        const apiResult = await response.json();
        
        if (apiResult.error) {
          throw new Error(apiResult.error);
        }

        // Transform API result to dashboard format
        const transformResult = (result: any): MetricData => {
          if (!result.result) {
            return { metricName: widgetKey.metricName, breakdown: widgetKey.breakdown, data: {} };
          }

          const { type, data } = result.result;
          
          switch (type) {
            case 'total':
              return {
                metricName: widgetKey.metricName,
                breakdown: widgetKey.breakdown,
                data: {
                  value: data.value || 0,
                  comparison: {
                    value: Math.floor(Math.random() * 40) - 20, // TODO: Add real comparison logic
                    type: 'percentage' as const
                  }
                }
              };
              
            case 'rep':
            case 'setter':
              return {
                metricName: widgetKey.metricName,
                breakdown: widgetKey.breakdown,
                data: data.map((item: any) => ({
                  name: item.repName || item.setterName || item.name || 'Unknown',
                  value: item.value || 0
                }))
              };
              
            case 'link':
              return {
                metricName: widgetKey.metricName,
                breakdown: widgetKey.breakdown,
                data: data.map((item: any) => ({
                  setterId: item.setterId,
                  setterName: item.setterName,
                  repId: item.repId,
                  repName: item.repName,
                  value: item.value || 0
                }))
              };
              
            default:
              return { metricName: widgetKey.metricName, breakdown: widgetKey.breakdown, data: {} };
          }
        };

        const transformedData = transformResult(apiResult);
        setData(transformedData);
        
      } catch (err) {
        console.error('Error fetching widget data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        
        // Fallback to generate mock data for development
        const mockData = generateMockData(widget, relevantEntities);
        setData(mockData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [widgetKey, stableFilters, selectedAccountId, relevantEntities.length, compareMode]);
  
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
        // For total breakdowns, create a single point line
        if (widget.breakdown === 'total') {
          const lineData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <LineChart
              key={chartKey}
              data={lineData}
              lines={[{
                dataKey: 'value',
                name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              xAxisType="category"
              showLegend={false}
              disableTooltip={isDragging}
            />
          );
        }
        
        // For rep/setter breakdowns, use the array data
        if (widget.breakdown === 'rep' || widget.breakdown === 'setter') {
          return (
            <LineChart
              key={chartKey}
              data={Array.isArray(data.data) ? data.data : []}
              lines={[{
                dataKey: 'value',
                name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              xAxisType="category"
              showLegend={false}
              disableTooltip={isDragging}
            />
          );
        }
        
        // Default fallback
        return (
          <LineChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : [{ name: 'No data', value: 0 }]}
            lines={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="name"
            xAxisType="category"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );
        
      case 'bar':
        // For total breakdowns, create a single bar
        if (widget.breakdown === 'total') {
          const barData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <BarChart
              key={chartKey}
              data={barData}
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
        
        // For rep/setter/link breakdowns, use the array data
        return (
          <BarChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : []}
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
        // For total breakdowns, create a single point area
        if (widget.breakdown === 'total') {
          const areaData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <AreaChart
              key={chartKey}
              data={areaData}
              areas={[{
                dataKey: 'value',
                name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              xAxisType="category"
              showLegend={false}
              disableTooltip={isDragging}
            />
          );
        }
        
        // For rep/setter breakdowns, use the array data
        if (widget.breakdown === 'rep' || widget.breakdown === 'setter') {
          return (
            <AreaChart
              key={chartKey}
              data={Array.isArray(data.data) ? data.data : []}
              areas={[{
                dataKey: 'value',
                name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              xAxisType="category"
              showLegend={false}
              disableTooltip={isDragging}
            />
          );
        }
        
        // Default fallback
        return (
          <AreaChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : [{ name: 'No data', value: 0 }]}
            areas={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'hsl(var(--primary))'
            }]}
            xAxisKey="name"
            xAxisType="category"
            showLegend={false}
            disableTooltip={isDragging}
          />
        );
        
      case 'pie':
        // For total breakdowns, pie chart doesn't make sense, show a single slice
        if (widget.breakdown === 'total') {
          const pieData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <PieChart
              key={chartKey}
              data={pieData}
              showLegend={false}
              showLabels={true}
              disableTooltip={isDragging}
            />
          );
        }
        
        // For rep/setter breakdowns, use the array data
        return (
          <PieChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : []}
            showLegend={true}
            showLabels={true}
            disableTooltip={isDragging}
          />
        );
        
      case 'donut':
        // For total breakdowns, donut chart doesn't make sense, show a single slice
        if (widget.breakdown === 'total') {
          const donutData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <DonutChart
              key={chartKey}
              data={donutData}
              showLegend={false}
              showLabels={true}
              disableTooltip={isDragging}
            />
          );
        }
        
        // For rep/setter breakdowns, use the array data
        return (
          <DonutChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : []}
            showLegend={true}
            showLabels={true}
            disableTooltip={isDragging}
          />
        );

      case 'horizontalBar':
        // For total breakdowns, create a single bar
        if (widget.breakdown === 'total') {
          const hBarData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <HorizontalBarChart
              key={chartKey}
              data={hBarData}
              dataKey="value"
              nameKey="name"
              color='hsl(var(--primary))'
              showLegend={false}
            />
          );
        }
        
        // For rep/setter breakdowns, use the array data
        return (
          <HorizontalBarChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : []}
            dataKey="value"
            nameKey="name"
            color='hsl(var(--primary))'
            showLegend={false}
          />
        );

      case 'stackedBar':
        // For total breakdowns, stacked bar doesn't make sense
        if (widget.breakdown === 'total') {
          const stackedData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          return (
            <StackedBarChart
              key={chartKey}
              data={stackedData}
              series={[{ key: 'value', name: 'Total', color: 'hsl(var(--primary))' }]}
              xAxisKey="name"
              showLegend={false}
            />
          );
        }
        
        // For rep/setter breakdowns, use single series for now
        return (
          <StackedBarChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data : []}
            series={[{ key: 'value', name: widget.settings?.title || widget.metricName, color: 'hsl(var(--primary))' }]}
            xAxisKey="name"
            showLegend={true}
          />
        );

      case 'sparkline':
        // For total breakdowns, create a minimal sparkline
        if (widget.breakdown === 'total') {
          const sparkData = [{ value: (data.data as any).value || 0 }];
          return (
            <SparklineChart
              key={chartKey}
              data={sparkData}
              color='hsl(var(--primary))'
            />
          );
        }
        
        // For rep/setter breakdowns, use the values
        return (
          <SparklineChart
            key={chartKey}
            data={Array.isArray(data.data) ? data.data.map((d: any) => ({ value: d.value })) : []}
            color='hsl(var(--primary))'
          />
        );
 
      case 'table':
        // For total breakdowns, show a simple table
        if (widget.breakdown === 'total') {
          const tableData = [{
            name: 'Total',
            value: (data.data as any).value || 0
          }];
          const simpleColumns = [
            { key: 'name', label: 'Metric' },
            { key: 'value', label: 'Value', type: 'number' as const, align: 'right' as const }
          ];
          
          return (
            <TableChart
              key={chartKey}
              data={tableData}
              columns={simpleColumns}
              showRowNumbers={false}
              striped={false}
              hoverable={false}
            />
          );
        }
        
        // For rep/setter breakdowns, show name and value
        const tableData2 = Array.isArray(data.data) ? data.data : [];
        const columns2 = [
          { key: 'name', label: widget.breakdown === 'rep' ? 'Rep' : 'Setter' },
          { key: 'value', label: 'Value', type: 'number' as const, align: 'right' as const }
        ];
        
        return (
          <TableChart
            key={chartKey}
            data={tableData2}
            columns={columns2}
            showRowNumbers={true}
            striped={true}
            hoverable={true}
          />
        );
        
      case 'scatter':
        // For scatter we need x,y pairs - for now use index as x
        const scatterData = widget.breakdown === 'total' 
          ? [{ x: 0, y: (data.data as any).value || 0, name: 'Total' }]
          : Array.isArray(data.data) 
            ? data.data.map((d: any, i: number) => ({ x: i, y: d.value, name: d.name }))
            : [];
        
        return (
          <ScatterChart
            key={chartKey}
            data={scatterData}
            series={[{ name: widget.settings?.title || widget.metricName, color: 'hsl(var(--primary))' }]}
            xLabel="Index"
            yLabel="Value"
          />
        );
        
      case 'radar':
        // For radar chart, we need multiple data points
        if (widget.breakdown === 'total') {
          // Radar doesn't make sense for single total, show as single point
          const radarData = [{ category: 'Total', value: (data.data as any).value || 0 }];
          return (
            <RadarChart
              key={chartKey}
              data={radarData}
              categoryKey="category"
              series={[{ key: 'value', name: 'Total', color: 'hsl(var(--primary))' }]}
            />
          );
        }
        
        // For rep/setter breakdowns
        const radarData = Array.isArray(data.data) 
          ? data.data.map((d: any) => ({ category: d.name, value: d.value }))
          : [];
          
        return (
          <RadarChart
            key={chartKey}
            data={radarData}
            categoryKey="category"
            series={[{ key: 'value', name: widget.settings?.title || widget.metricName, color: 'hsl(var(--primary))' }]}
          />
        );
        
      case 'radialBar':
        // For total breakdowns
        if (widget.breakdown === 'total') {
          const radialData = [{
            name: 'Total',
            value: (data.data as any).value || 0,
            fill: 'hsl(var(--primary))'
          }];
          return (
            <RadialBarChart
              key={chartKey}
              data={radialData}
            />
          );
        }
        
        // For rep/setter breakdowns
        const colors = ['hsl(var(--primary))', 'hsl(215 70% 50%)', 'hsl(142 71% 45%)', 'hsl(47 85% 63%)', 'hsl(280 70% 50%)'];
        const radialData = Array.isArray(data.data) 
          ? data.data.slice(0, 5).map((d: any, i: number) => ({ // Limit to 5 for radial bar
              name: d.name,
              value: d.value,
              fill: colors[i % colors.length]
            }))
          : [];
          
        return (
          <RadialBarChart
            key={chartKey}
            data={radialData}
          />
        );
        
      default:
        return <div>Unsupported visualization type: {widget.vizType}</div>;
    }
  }, [data, widgetKey, widget.settings, metricDefinition, isDragging, compareMode, relevantEntities]);
  
  return (
    <>
      <div>
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
          onFullscreen={() => setShowDetailModal(true)}
        >
          {isDragging ? (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded">
              <div className="text-sm text-muted-foreground">Moving...</div>
            </div>
                  ) : !selectedAccountId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-sm mb-1">No account selected</div>
              <div className="text-xs">Please select an account from the sidebar</div>
            </div>
          </div>
        ) : (
          <div key={`widget-content-${widget.id}`} className="h-full">
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