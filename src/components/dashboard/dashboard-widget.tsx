"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  const [multiSeries, setMultiSeries] = useState<Array<{ name: string; series: Array<{ date: string; value: number }> }>>([]);
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
  
  // Multi-line compare state (legacy compare mode disabled)
  const [compareData, setCompareData] = useState<Array<Record<string, any>>>([]);
  const [compareLines, setCompareLines] = useState<Array<{ dataKey: string; name: string }>>([]);

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
    metricNames: widget.metricNames,
    breakdown: widget.breakdown,
    vizType: widget.vizType
  }), [widget.id, widget.metricName, widget.metricNames, widget.breakdown, widget.vizType]);
  
  const stableFilters = useMemo(() => JSON.stringify(filters), [filters]);
  
  const formatLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map dashboard metric name to engine metric name based on breakdown
  const getEngineMetricName = (dashboardMetricName: string, breakdown: string) => {
    if (dashboardMetricName.includes('appointment')) {
      if (breakdown === 'total') return 'total_appointments';
      if (breakdown === 'rep') return 'total_appointments_reps'; 
      if (breakdown === 'setter') return 'total_appointments_setters';
      if (breakdown === 'link') return 'appointments_link';
    }
    return dashboardMetricName;
  };

  useEffect(() => {
    setCompareData([]);
    setCompareLines([]);
  }, [compareMode, JSON.stringify(compareEntities), compareModeSettings.scope, widget.vizType, widget.metricName, selectedAccountId, filters.startDate, filters.endDate]);

  const hasAnimatedRef = useRef(false);

  // Helper: unit formatting for tooltips/KPI
  const formatValue = useCallback((val: number, unit?: string) => {
    if (unit === 'currency') return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    if (unit === 'percent') return `${Math.round((val || 0) * 100)}%`;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(val || 0);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(undefined);
      
      try {
        if (!selectedAccountId) { setIsLoading(false); return; }

        const { filters: globalFilters, getCachedMetric, setCachedMetric } = useDashboardStore.getState();

        // Prepare filters for metrics API
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let startDate: Date, endDate: Date;
        try {
          startDate = globalFilters.startDate 
            ? (globalFilters.startDate instanceof Date ? globalFilters.startDate : new Date(globalFilters.startDate))
            : thirtyDaysAgo;
          endDate = globalFilters.endDate 
            ? (globalFilters.endDate instanceof Date ? globalFilters.endDate : new Date(globalFilters.endDate))
            : now;
          if (isNaN(startDate.getTime())) startDate = thirtyDaysAgo;
          if (isNaN(endDate.getTime())) endDate = now;
        } catch {
          startDate = thirtyDaysAgo; endDate = now;
        }

        const requestFilters = {
          dateRange: { start: formatLocalYMD(startDate), end: formatLocalYMD(endDate) },
          accountId: selectedAccountId,
          repIds: globalFilters.repIds,
          setterIds: globalFilters.setterIds
        };

        // Helper to call metrics API for a single metric name
        const fetchMetric = async (metricName: string): Promise<MetricData> => {
          const cacheKey = JSON.stringify({ metric: metricName, viz: widget.vizType, breakdown: widgetKey.breakdown, filters: requestFilters });
          const cached = getCachedMetric(cacheKey);
          if (cached) return cached as MetricData;

          const engineMetricName = getEngineMetricName(metricName, widgetKey.breakdown);
          const response = await fetch('/api/metrics', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metricName: engineMetricName, filters: requestFilters, vizType: widget.vizType, breakdown: widgetKey.breakdown })
          });
          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          const apiResult = await response.json();
          const engineResult = apiResult?.result;

          let transformed: MetricData;
          if ((widget.vizType === 'line' || widget.vizType === 'bar' || widget.vizType === 'area' || widget.vizType === 'radar') && engineResult?.type === 'time') {
            transformed = { metricName, breakdown: widgetKey.breakdown, data: Array.isArray(engineResult?.data) ? engineResult.data : [] };
          } else {
            transformed = { metricName, breakdown: widgetKey.breakdown, data: { value: (engineResult?.data?.value ?? 0) } };
          }
          setCachedMetric(cacheKey, transformed);
          return transformed;
        };

        // If KPI or only one metric
        const names = (widget.metricNames && widget.metricNames.length > 0 ? widget.metricNames : [widget.metricName]).slice(0, widget.vizType === 'kpi' ? 1 : 3);

        if (widget.vizType === 'kpi' || names.length === 1) {
          const single = await fetchMetric(names[0]);
          setData(single);
          setMultiSeries([]);
          setIsLoading(false);
          return;
        }

        // Multi-metric fetch and merge as series
        const results = await Promise.all(names.map(fetchMetric));
        const series = results.map(r => ({
          name: metricsRegistry.find(m => m.name === r.metricName)?.displayName || r.metricName,
          series: Array.isArray(r.data) ? r.data.map((d: any) => ({ date: d.date, value: d.value })) : [{ date: 'Current', value: r.data?.value || 0 }]
        }));
        setMultiSeries(series);
        setData(null);
      } catch (err) {
        console.error('Error fetching widget data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        const mockData = generateMockData(widget, relevantEntities);
        setData(mockData);
      } finally {
        setIsLoading(false);
        if (!hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
        }
      }
    };
    
    fetchData();
  }, [widgetKey, stableFilters, selectedAccountId, relevantEntities.length, compareMode]);
  
  const renderChart = useCallback(() => {
    const unit = metricDefinition?.unit;

    if (widget.vizType === 'kpi') {
      if (!data) return null;
      const chartKey = `chart-${widget.id}-${widget.vizType}-${widget.size.w}x${widget.size.h}-${isDragging ? 'dragging' : 'static'}`;
      return (
        <KPIChart
          key={chartKey}
          value={formatValue(Number((data as any).data.value), unit)}
          unit={unit === 'percent' ? '' : unit === 'currency' ? '' : ''}
          comparison={undefined}
        />
      );
    }

    // Non-KPI: support up to 3 series
    const names = (widget.metricNames && widget.metricNames.length > 0 ? widget.metricNames : [widget.metricName]).slice(0, 3);

    const formatLabel = (name: string) => metricsRegistry.find(m => m.name === name)?.displayName || name;

    if (names.length === 1 && data) {
      // Fallback to legacy single series rendering paths
      switch (widget.vizType) {
        case 'line': {
          const lineData = Array.isArray(data.data) ? data.data.map((it: any) => ({ date: it.date, value: it.value })) : [{ date: 'Current', value: data.data.value || 0 }];
          return (
            <LineChart
              data={lineData.map(d => ({ ...d, value: unit === 'percent' ? Math.round(d.value * 100) : d.value }))}
              lines={[{ dataKey: 'value', name: widget.settings?.title || formatLabel(names[0]), color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              disableTooltip={isDragging}
              animate={!hasAnimatedRef.current}
              className="h-full"
            />
          );
        }
        case 'bar': {
          const barData = Array.isArray(data.data) ? data.data.map((it: any) => ({ date: it.date, value: it.value })) : [{ date: 'Current', value: data.data.value || 0 }];
          return (
            <BarChart
              data={barData.map(d => ({ ...d, value: unit === 'percent' ? Math.round(d.value * 100) : d.value }))}
              bars={[{ dataKey: 'value', name: widget.settings?.title || formatLabel(names[0]), color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              disableTooltip={isDragging}
              animate={!hasAnimatedRef.current}
              className="h-full"
            />
          );
        }
        case 'area': {
          const areaData = Array.isArray(data.data) ? data.data.map((it: any) => ({ date: it.date, value: it.value })) : [{ date: 'Current', value: data.data.value || 0 }];
          return (
            <AreaChart
              data={areaData.map(d => ({ ...d, value: unit === 'percent' ? Math.round(d.value * 100) : d.value }))}
              areas={[{ dataKey: 'value', name: widget.settings?.title || formatLabel(names[0]), color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              disableTooltip={isDragging}
              animate={!hasAnimatedRef.current}
              className="h-full"
            />
          );
        }
        case 'radar': {
          const radarData = Array.isArray(data.data) ? data.data.map((it: any) => ({ date: it.date, value: it.value })) : [{ date: 'Current', value: data.data.value || 0 }];
          return (
            <RadarChart
              key={`chart-${widget.id}`}
              data={radarData.map(d => ({ ...d, value: unit === 'percent' ? Math.round(d.value * 100) : d.value }))}
              radarSeries={[{ dataKey: 'value', name: widget.settings?.title || formatLabel(names[0]), color: 'var(--primary)' }]}
              angleKey="date"
              showLegend={false}
              disableTooltip={isDragging}
              className="h-full"
            />
          );
        }
      }
    }

    // Multi-series path
    const merged: Array<Record<string, any>> = [];
    multiSeries.forEach((s, idx) => {
      const key = `series_${idx}`;
      s.series.forEach(point => {
        const v = point.value;
        const existing = merged.find(m => m.date === point.date);
        if (existing) existing[key] = v; else merged.push({ date: point.date, [key]: v });
      });
    });

    const lines = multiSeries.map((s, idx) => ({ dataKey: `series_${idx}`, name: s.name, color: `var(--chart-${(idx % 10) + 1})` }));

    switch (widget.vizType) {
      case 'line':
        return (
          <LineChart
            data={merged}
            lines={lines}
            xAxisKey="date"
            showLegend
            showGrid
            disableTooltip={isDragging}
            animate={!hasAnimatedRef.current}
            className="h-full"
          />
        );
      case 'bar':
        return (
          <BarChart
            data={merged}
            bars={lines as any}
            xAxisKey="date"
            showLegend
            showGrid
            disableTooltip={isDragging}
            animate={!hasAnimatedRef.current}
            className="h-full"
          />
        );
      case 'area':
        return (
          <AreaChart
            data={merged}
            areas={lines as any}
            xAxisKey="date"
            showLegend
            showGrid
            disableTooltip={isDragging}
            animate={!hasAnimatedRef.current}
            className="h-full"
          />
        );
      case 'radar': {
        return (
          <RadarChart
            key={`chart-${widget.id}`}
            data={merged}
            radarSeries={lines as any}
            angleKey="date"
            showLegend
            disableTooltip={isDragging}
            className="h-full"
          />
        );
      }
      default:
        return null;
    }
  }, [data, multiSeries, widgetKey, widget.settings, metricDefinition, isDragging, compareMode, relevantEntities]);
  
  return (
    <>
      <div className="h-full">
        <ChartWrapper
          title={widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          description={metricDefinition?.description}
          onDelete={() => removeWidget(widget.id)}
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