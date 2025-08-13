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
  
  // Generate appropriate data based on breakdown type, but always format for KPI display
  if (breakdown === 'total') {
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
  }
  
  if (breakdown === 'time') {
    // For time breakdown, generate time series data but convert to total for KPI display
    const days = 30;
    const timeSeriesData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString(),
        value: Math.floor(Math.random() * 1000) + 500
      };
    });
    
    // Calculate total from time series for KPI display
    const totalValue = timeSeriesData.reduce((sum, point) => sum + point.value, 0);
    const avgValue = totalValue / timeSeriesData.length;
    const recentAvg = timeSeriesData.slice(-7).reduce((sum, point) => sum + point.value, 0) / 7;
    const comparison = ((recentAvg - avgValue) / avgValue) * 100;
    
    return {
      metricName,
      breakdown,
      data: {
        value: totalValue,
        comparison: {
          value: Math.round(comparison),
          type: 'percentage' as const
        },
        // Store raw time series data for potential future use
        rawData: timeSeriesData
      }
    };
  }
  
  if (breakdown === 'rep' || breakdown === 'setter') {
    // For rep/setter breakdown, generate per-entity data but sum for KPI display
    const entities = breakdown === 'rep' 
      ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown']
      : ['Alex Chen', 'Maria Garcia', 'David Lee', 'Emma Wilson', 'Frank Miller'];
    
    const entityData = entities.map(name => ({
      name,
      value: Math.floor(Math.random() * 5000) + 1000
    }));
    
    // Calculate total across all entities for KPI display
    const totalValue = entityData.reduce((sum, entity) => sum + entity.value, 0);
    const avgValue = totalValue / entityData.length;
    const topPerformer = Math.max(...entityData.map(e => e.value));
    const comparison = ((topPerformer - avgValue) / avgValue) * 100;
    
    return {
      metricName,
      breakdown,
      data: {
        value: totalValue,
        comparison: {
          value: Math.round(comparison),
          type: 'percentage' as const
        },
        // Store raw entity data for potential future use
        rawData: entityData
      }
    };
  }
  
  if (breakdown === 'link') {
    // For setter-rep link breakdown, generate pair data but aggregate for KPI display
    const pairs = [
      { setterId: '1', setterName: 'Alice Johnson', repId: '2', repName: 'Bob Smith' },
      { setterId: '3', setterName: 'Charlie Brown', repId: '4', repName: 'Diana Ross' },
      { setterId: '5', setterName: 'Eve Davis', repId: '6', repName: 'Frank Miller' },
      { setterId: '7', setterName: 'Grace Lee', repId: '8', repName: 'Henry Wilson' },
      { setterId: '9', setterName: 'Ivy Chen', repId: '10', repName: 'Jack Taylor' },
    ];
    
    const pairData = pairs.map(pair => {
      const appointments = Math.floor(Math.random() * 50) + 10;
      const revenue = appointments * (Math.floor(Math.random() * 2000) + 1000);
      
      return {
        setterId: pair.setterId,
        setterName: pair.setterName,
        repId: pair.repId,
        repName: pair.repName,
        appointments,
        revenue,
        closeRate: Math.floor(Math.random() * 30) + 10,
        avgDeal: revenue / appointments,
        trend: Math.floor(Math.random() * 40) - 20
      };
    });
    
    // Aggregate metric based on metric name
    let totalValue = 0;
    if (metricName.includes('appointment')) {
      totalValue = pairData.reduce((sum, pair) => sum + pair.appointments, 0);
    } else if (metricName.includes('revenue')) {
      totalValue = pairData.reduce((sum, pair) => sum + pair.revenue, 0);
    } else {
      // Default to appointments
      totalValue = pairData.reduce((sum, pair) => sum + pair.appointments, 0);
    }
    
    const avgTrend = pairData.reduce((sum, pair) => sum + pair.trend, 0) / pairData.length;
    
    return {
      metricName,
      breakdown,
      data: {
        value: totalValue,
        comparison: {
          value: Math.round(avgTrend),
          type: 'percentage' as const
        },
        // Store raw pair data for potential future use
        rawData: pairData
      }
    };
  }
  
  // Default fallback
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

// Transform API response to KPI format
const transformApiResultToKPI = (apiResult: any, widget: WidgetType): MetricData => {
  const { metricName, breakdown } = widget;
  
  if (!apiResult.result) {
    return { metricName, breakdown, data: { value: 0, comparison: { value: 0, type: 'percentage' as const } } };
  }

  const { type, data } = apiResult.result;
  
  switch (type) {
    case 'total':
      return {
        metricName,
        breakdown,
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
      // Sum all entity values for KPI display
      const totalValue = data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const avgValue = totalValue / data.length;
      const maxValue = Math.max(...data.map((item: any) => item.value || 0));
      const comparison = avgValue > 0 ? ((maxValue - avgValue) / avgValue) * 100 : 0;
      
      return {
        metricName,
        breakdown,
        data: {
          value: totalValue,
          comparison: {
            value: Math.round(comparison),
            type: 'percentage' as const
          },
          rawData: data.map((item: any) => ({
            name: item.repName || item.setterName || item.name || 'Unknown',
            value: item.value || 0
          }))
        }
      };
      
    case 'link':
      // Aggregate setter-rep pairs for KPI display
      let aggregatedValue = 0;
      if (metricName.includes('appointment')) {
        aggregatedValue = data.reduce((sum: number, item: any) => sum + (item.appointments || item.value || 0), 0);
      } else if (metricName.includes('revenue')) {
        aggregatedValue = data.reduce((sum: number, item: any) => sum + (item.revenue || item.value || 0), 0);
      } else {
        aggregatedValue = data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      }
      
      const avgTrend = data.reduce((sum: number, item: any) => sum + (item.trend || 0), 0) / data.length;
      
      return {
        metricName,
        breakdown,
        data: {
          value: aggregatedValue,
          comparison: {
            value: Math.round(avgTrend || 0),
            type: 'percentage' as const
          },
          rawData: data.map((item: any) => ({
            setterId: item.setterId,
            setterName: item.setterName,
            repId: item.repId,
            repName: item.repName,
            value: item.value || 0
          }))
        }
      };
      
    case 'time':
      // Calculate total from time series for KPI display
      const timeTotal = data.reduce((sum: number, point: any) => sum + (point.value || 0), 0);
      const timeAvg = timeTotal / data.length;
      const recentPoints = data.slice(-7);
      const recentAvg = recentPoints.reduce((sum: number, point: any) => sum + (point.value || 0), 0) / recentPoints.length;
      const timeComparison = timeAvg > 0 ? ((recentAvg - timeAvg) / timeAvg) * 100 : 0;
      
      return {
        metricName,
        breakdown,
        data: {
          value: timeTotal,
          comparison: {
            value: Math.round(timeComparison),
            type: 'percentage' as const
          },
          rawData: data.map((point: any) => ({
            date: point.date,
            value: point.value || 0
          }))
        }
      };
      
    default:
      return { metricName, breakdown, data: { value: 0, comparison: { value: 0, type: 'percentage' as const } } };
  }
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

          const engineMetricName = getEngineMetricName(widget.metricName, widget.breakdown);
          
          // Prepare filters for metrics API
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const metricsFilters = {
            dateRange: {
              start: filters.startDate || thirtyDaysAgo.toISOString(),
              end: filters.endDate || now.toISOString()
            },
            accountId: selectedAccountId,
            repIds: filters.repIds,
            setterIds: filters.setterIds
          };

          // Try to fetch real data first
          const response = await fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metricName: engineMetricName,
              filters: metricsFilters
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // Transform API result to KPI format
              const transformedData = transformApiResultToKPI(result.data, widget);
              setData(transformedData);
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