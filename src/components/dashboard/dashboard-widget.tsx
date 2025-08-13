"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  ChartWrapper, 
  KPIChart,
  LineChart,
  BarChart,
  AreaChart,
  RadarChart
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

// Generate mock data based on breakdown type for development
const generateMockData = (widget: WidgetType, relevantEntities: any[]): MetricData => {
  const { metricName, breakdown } = widget;
  
  // For compare mode metrics (no longer applicable since we only have KPI)
  // This is kept for backwards compatibility but won't be used
  
  // For KPI widgets, always return a single value
  return { 
    metricName, 
    breakdown, 
    data: { 
      value: Math.floor(Math.random() * 1000),
      comparison: {
        value: Math.floor(Math.random() * 1000),
        change: (Math.random() - 0.5) * 100,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }
    }
  };
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
  
  // Multi-line compare state for line widgets
  const [compareData, setCompareData] = useState<Array<Record<string, any>>>([]);
  const [compareLines, setCompareLines] = useState<Array<{ dataKey: string; name: string }>>([]);

  // Special handling for compare mode widgets (no longer applicable since we only have KPI)
  // This is kept for backwards compatibility but won't be used
  
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
  
  // Helper to format dates for API
  const formatLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map dashboard metric name to engine metric name based on breakdown
  const getEngineMetricName = (dashboardMetricName: string, breakdown: string) => {
    // Map common dashboard metrics to engine metrics based on breakdown
    if (dashboardMetricName.includes('appointment')) {
      if (breakdown === 'total') return 'total_appointments';
      if (breakdown === 'rep') return 'total_appointments_reps'; 
      if (breakdown === 'setter') return 'total_appointments_setters';
      if (breakdown === 'link') return 'appointments_link';
    }
    
    // Default fallback - use the metric name as-is
    return dashboardMetricName;
  };

  // Build multi-series for global compare (line charts)
  useEffect(() => {
    // Compare functionality disabled on main dashboard
    setCompareData([]);
    setCompareLines([]);
  }, [compareMode, JSON.stringify(compareEntities), compareModeSettings.scope, widget.vizType, widget.metricName, selectedAccountId, filters.startDate, filters.endDate]);

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
        
        // Ensure dates are Date objects before calling toISOString
        let startDate: Date, endDate: Date;
        try {
          startDate = globalFilters.startDate 
            ? (globalFilters.startDate instanceof Date ? globalFilters.startDate : new Date(globalFilters.startDate))
            : thirtyDaysAgo;
          endDate = globalFilters.endDate 
            ? (globalFilters.endDate instanceof Date ? globalFilters.endDate : new Date(globalFilters.endDate))
            : now;

          // Validate that the dates are valid
          if (isNaN(startDate.getTime())) {
            console.warn('Invalid startDate, using fallback:', globalFilters.startDate);
            startDate = thirtyDaysAgo;
          }
          if (isNaN(endDate.getTime())) {
            console.warn('Invalid endDate, using fallback:', globalFilters.endDate);
            endDate = now;
          }
        } catch (dateError) {
          console.error('Error parsing dates, using fallbacks:', dateError);
          startDate = thirtyDaysAgo;
          endDate = now;
        }

        // Format as local calendar dates to avoid UTC shifting previous day/month
        const formatLocalYMD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const requestFilters = {
          dateRange: {
            start: formatLocalYMD(startDate),
            end: formatLocalYMD(endDate)
          },
          accountId: selectedAccountId,
          repIds: globalFilters.repIds,
          setterIds: globalFilters.setterIds
        };

        // Map dashboard metric name to engine metric name based on breakdown
        const engineMetricName = getEngineMetricName(widgetKey.metricName, widgetKey.breakdown);

        console.log('🐛 DEBUG - Dashboard Widget API Call:', {
          originalMetricName: widgetKey.metricName,
          breakdown: widgetKey.breakdown,
          engineMetricName,
          filters: requestFilters,
          globalFiltersDebug: {
            startDate: globalFilters.startDate,
            endDate: globalFilters.endDate,
            startDateType: typeof globalFilters.startDate,
            endDateType: typeof globalFilters.endDate
          },
          accountInfo: {
            selectedAccountId,
            accountIdInFilters: requestFilters.accountId
          }
        });

        // Call metrics API
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metricName: engineMetricName,
            filters: requestFilters,
            vizType: widget.vizType, // Include visualization type
            breakdown: widgetKey.breakdown
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🐛 DEBUG - API Error Response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const apiResult = await response.json();
        console.log('🐛 DEBUG - API Success Response:', apiResult);
        
        // Transform API result to match expected format (use engine result wrapper)
        const engineResult = apiResult?.result;
        
        let transformedData: MetricData;
        
        if ((widget.vizType === 'line' || widget.vizType === 'bar' || widget.vizType === 'area' || widget.vizType === 'radar') && engineResult?.type === 'time') {
          // For line and bar charts, engine dynamically converts to time-series
          transformedData = {
            metricName: widgetKey.metricName,
            breakdown: widgetKey.breakdown,
            data: Array.isArray(engineResult?.data) ? engineResult.data : []
          };
        } else {
          // For KPI and other visualizations, expect single value
          transformedData = {
            metricName: widgetKey.metricName,
            breakdown: widgetKey.breakdown,
            data: { value: (engineResult?.data?.value ?? 0) }
          };
        }
        
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
    const chartKey = `chart-${widget.id}-${widget.vizType}-${widget.size.w}x${widget.size.h}-${isDragging ? 'dragging' : 'static'}`;
    
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
        // For line charts, we need time-series data
        let lineData;
        let xAxisKey;

        // If global compare provides series, use them
        if (compareMode && compareLines.length > 0 && compareData.length > 0) {
          return (
            <LineChart
              key={chartKey}
              data={compareData}
              lines={compareLines.map((l, idx) => ({ dataKey: l.dataKey, name: l.name, color: `var(--chart-${(idx % 10) + 1})` }))}
              xAxisKey="date"
              showLegend
              showGrid
              disableTooltip={isDragging}
              className="h-full"
            />
          );
        }
        
        if (Array.isArray(data.data) && data.data.length > 0) {
          // Time-series data from engine
          lineData = data.data.map((item: any) => ({
            date: item.date || item.name,
            value: item.value || 0
          }));
          xAxisKey = 'date';
        } else {
          // Fallback for non-time-series data
          lineData = [
            { date: 'Current', value: data.data.value || 0 }
          ];
          xAxisKey = 'date';
        }
        
        return (
          <LineChart
            key={chartKey}
            data={lineData}
            lines={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'var(--primary)'
            }]}
            xAxisKey={xAxisKey}
            showLegend={false}
            showGrid={true}
            disableTooltip={isDragging}
            className="h-full"
          />
        );
      case 'bar':
        // Same data as line chart
        let barData;
        let barXAxisKey;
        if (Array.isArray(data.data) && data.data.length > 0) {
          barData = data.data.map((item: any) => ({
            date: item.date || item.name,
            value: item.value || 0
          }));
          barXAxisKey = 'date';
        } else {
          barData = [
            { date: 'Current', value: data.data.value || 0 }
          ];
          barXAxisKey = 'date';
        }

        return (
          <BarChart
            key={chartKey}
            data={barData}
            bars={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'var(--primary)'
            }]}
            xAxisKey={barXAxisKey}
            showLegend={false}
            showGrid={true}
            disableTooltip={isDragging}
            className="h-full"
          />
        );
      case 'area':
        let areaData;
        let areaXAxisKey;
        if (Array.isArray(data.data) && data.data.length > 0) {
          areaData = data.data.map((item: any) => ({
            date: item.date || item.name,
            value: item.value || 0
          }));
          areaXAxisKey = 'date';
        } else {
          areaData = [
            { date: 'Current', value: data.data.value || 0 }
          ];
          areaXAxisKey = 'date';
        }
        return (
          <AreaChart
            key={chartKey}
            data={areaData}
            areas={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'var(--primary)'
            }]}
            xAxisKey={areaXAxisKey}
            showLegend={false}
            showGrid={true}
            disableTooltip={isDragging}
            className="h-full"
          />
        );
      case 'radar':
        let radarData;
        let radarAngleKey;
        if (Array.isArray(data.data) && data.data.length > 0) {
          radarData = data.data.map((item: any) => ({
            date: item.date || item.name,
            value: item.value || 0
          }));
          radarAngleKey = 'date';
        } else {
          radarData = [
            { date: 'Current', value: data.data.value || 0 }
          ];
          radarAngleKey = 'date';
        }
        return (
          <RadarChart
            key={chartKey}
            data={radarData}
            radarSeries={[{
              dataKey: 'value',
              name: widget.settings?.title || metricDefinition?.displayName || widget.metricName,
              color: 'var(--primary)'
            }]}
            angleKey={radarAngleKey}
            showLegend={false}
            disableTooltip={isDragging}
            className="h-full"
          />
        );
      default:
        return (
          <KPIChart
            key={chartKey}
            value={data.data.value}
            unit={metricDefinition?.unit}
            comparison={data.data.comparison}
          />
        );
    }
  }, [data, widgetKey, widget.settings, metricDefinition, isDragging, compareMode, relevantEntities]);
  
  return (
    <>
      <div className="h-full">
        <ChartWrapper
          title={widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          description={metricDefinition?.description}
          onFullscreen={() => setShowDetailModal(true)}
        >
          {renderChart()}
        </ChartWrapper>
      </div>
      {data && (
        <WidgetDetailModal widget={widget} data={data} open={showDetailModal} onOpenChange={setShowDetailModal} />)
      }
    </>
  );
} 