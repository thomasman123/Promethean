"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  ChartWrapper, 
  KPIChart
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
        
        const requestFilters = {
          dateRange: {
            start: (globalFilters.startDate || thirtyDaysAgo).toISOString(),
            end: (globalFilters.endDate || now).toISOString()
          },
          accountId: selectedAccountId,
          repIds: globalFilters.repIds,
          setterIds: globalFilters.setterIds
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

        const engineMetricName = getEngineMetricName(widgetKey.metricName, widgetKey.breakdown);

        console.log('🐛 DEBUG - Dashboard Widget API Call:', {
          originalMetricName: widgetKey.metricName,
          breakdown: widgetKey.breakdown,
          engineMetricName,
          filters: requestFilters
        });

        // Call metrics API
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metricName: engineMetricName,
            filters: requestFilters
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🐛 DEBUG - API Error Response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const apiResult = await response.json();
        console.log('🐛 DEBUG - API Success Response:', apiResult);
        
        // Transform API result to match expected format
        const transformResult = (result: any): MetricData => {
          if (!result || !result.data) {
            return { metricName: widgetKey.metricName, breakdown: widgetKey.breakdown, data: { value: 0 } };
          }
          
          // For all breakdowns, we now only support KPI visualization
          // so we need a single value
          switch (widgetKey.breakdown) {
            case 'total':
              return {
                metricName: widgetKey.metricName,
                breakdown: widgetKey.breakdown,
                data: result.data
              };
              
            case 'rep':
            case 'setter':
            case 'link':
              // For non-total breakdowns, we'll use the first value or aggregate
              const arrayData = Array.isArray(result.data) ? result.data : [];
              const totalValue = arrayData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
              return {
                metricName: widgetKey.metricName,
                breakdown: widgetKey.breakdown,
                data: { value: totalValue }
              };
              
            default:
              return { metricName: widgetKey.metricName, breakdown: widgetKey.breakdown, data: { value: 0 } };
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
    const chartKey = `chart-${widget.id}-${widget.vizType}-${widget.size.w}x${widget.size.h}-${isDragging ? 'dragging' : 'static'}`;
    
    // Only KPI visualization is supported
    return (
      <KPIChart
        key={chartKey}
        value={data.data.value}
        unit={metricDefinition?.unit}
        comparison={data.data.comparison}
      />
    );
  }, [data, widgetKey, widget.settings, metricDefinition, isDragging, compareMode, relevantEntities]);
  
  return (
    <>
      <div className="h-full">
        <ChartWrapper
          title={widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          description={metricDefinition?.description}
          onEdit={() => setShowDetailModal(true)}
          onDuplicate={() => duplicateWidget(widget.id)}
          onDelete={() => removeWidget(widget.id)}
          isLoading={isLoading}
          error={error}
        >
          {data && renderChart()}
        </ChartWrapper>
      </div>
      
      {showDetailModal && data && (
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