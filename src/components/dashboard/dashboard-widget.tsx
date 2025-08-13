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
  
  // Only support KPI visualization now
  return {
    metricName,
    breakdown,
    data: {
      value: Math.floor(Math.random() * 10000) + 5000,
      comparison: {
        value: Math.floor(Math.random() * 40) - 20,
        type: 'percentage' as const
      }
    }
  };
};

export function DashboardWidget({ widget, isDragging }: DashboardWidgetProps) {
  const [data, setData] = useState<MetricData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { 
    metricsRegistry, 
    filters, 
    compareMode, 
    compareEntities 
  } = useDashboardStore();
  const { selectedAccountId } = useAuth();

  // Get metric definition
  const metricDefinition = useMemo(() => {
    return metricsRegistry.find(m => m.name === widget.metricName);
  }, [metricsRegistry, widget.metricName]);

  // Create a stable key for widget rerenders
  const widgetKey = useMemo(() => {
    return `${widget.metricName}-${widget.breakdown}-${widget.vizType}`;
  }, [widget.metricName, widget.breakdown, widget.vizType]);

  // Create stable filters to prevent excessive rerenders
  const stableFilters = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  // Get relevant entities for this widget's breakdown
  const relevantEntities = useMemo(() => {
    if (!compareMode || !compareEntities) return [];
    
    const entityType = widget.breakdown === 'rep' ? 'rep' : 
                      widget.breakdown === 'setter' ? 'setter' : null;
    
    if (!entityType) return [];
    
    return compareEntities.filter(entity => entity.type === entityType);
  }, [compareMode, compareEntities, widget.breakdown]);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedAccountId) return;
      
      setIsLoading(true);
      
      try {
        // For compare mode with relevant entities, generate mock data
        if (compareMode && relevantEntities.length > 0) {
          const mockData = generateMockData(widget, relevantEntities);
          setData(mockData);
        } else {
          // Try to fetch real data first
          const response = await fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metricName: widget.metricName,
              breakdown: widget.breakdown,
              filters: {
                ...filters,
                accountId: selectedAccountId
              }
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setData(result.data);
            } else {
              // Fallback to mock data
              setData(generateMockData(widget));
            }
          } else {
            // Fallback to mock data
            setData(generateMockData(widget));
          }
        }
      } catch (error) {
        console.error('Error fetching widget data:', error);
        // Fallback to mock data
        setData(generateMockData(widget));
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
    
    // Only support KPI visualization now
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
          isLoading={isLoading}
          compareMode={compareMode}
          compareEntities={relevantEntities.length}
          onFullscreen={() => setShowDetailModal(true)}
        >
          {renderChart()}
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