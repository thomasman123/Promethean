"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GlobalFilters } from "@/components/dashboard/global-filters";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import { ViewsManager } from "@/components/dashboard/views-manager";
import { useDashboardStore } from "@/lib/dashboard/store";
import { MetricDefinition, BreakdownType, VizType } from "@/lib/dashboard/types";
import { useAuth } from "@/hooks/useAuth";
import { getAllMetricNames, getMetric } from "@/lib/metrics/registry";

// Map metrics engine metrics to dashboard format
const mapEngineMetricToDashboard = (engineMetricName: string): MetricDefinition | null => {
  const engineMetric = getMetric(engineMetricName);
  if (!engineMetric) return null;

  // Map breakdown types
  const getBreakdowns = (breakdownType: string): BreakdownType[] => {
    switch (breakdownType) {
      case 'total': return ['total'];
      case 'rep': return ['rep'];
      case 'setter': return ['setter'];
      case 'link': return ['link'];
      case 'time': return ['time'];
      default: return ['total'];
    }
  };

  // Map to recommended visualizations based on breakdown type
  const getRecommendedViz = (breakdownType: string): VizType[] => {
    switch (breakdownType) {
      case 'total': return ['kpi'];
      case 'time': return ['line', 'kpi'];
      default: return ['kpi', 'line'];
    }
  };

  // Categorize metrics
  const getCategory = (name: string) => {
    if (name.includes('appointment')) return 'Appointments';
    if (name.includes('show') || name.includes('rate')) return 'Quality';
    if (name.includes('revenue') || name.includes('deal')) return 'Revenue';
    return 'General';
  };

  return {
    name: engineMetricName,
    displayName: engineMetric.name,
    description: engineMetric.description,
    category: getCategory(engineMetricName),
    supportedBreakdowns: getBreakdowns(engineMetric.breakdownType),
    recommendedVisualizations: getRecommendedViz(engineMetric.breakdownType),
    formula: `${engineMetric.breakdownType} breakdown query`
  };
};

export default function DashboardPage() {
  const { 
    isAddWidgetModalOpen, 
    setAddWidgetModalOpen,
    setMetricsRegistry,
    isLoadingRegistry,
    setLoadingRegistry,
    widgets,
    isDirty,
    saveCurrentView,
    loadViewsForAccount
  } = useDashboardStore();

  const { selectedAccountId, accountChangeTimestamp } = useAuth();
  
  // Load real metrics registry
  useEffect(() => {
    const loadMetricsRegistry = async () => {
      setLoadingRegistry(true);
      try {
        // Get all metric names from the registry
        const metricNames = getAllMetricNames();
        
        // Map to dashboard format
        const dashboardMetrics: MetricDefinition[] = metricNames
          .map(mapEngineMetricToDashboard)
          .filter((metric): metric is MetricDefinition => metric !== null);

        setMetricsRegistry(dashboardMetrics);
      } catch (error) {
        console.error('Failed to load metrics registry:', error);
        // Fallback to minimal metrics if loading fails
        setMetricsRegistry([
          {
            name: "total_appointments",
            displayName: "Total Appointments", 
            description: "Total number of appointments",
            category: "Appointments",
            supportedBreakdowns: ["total"],
            recommendedVisualizations: ["kpi"],
            formula: "COUNT(appointments)"
          }
        ]);
      } finally {
        setLoadingRegistry(false);
      }
    };

    loadMetricsRegistry();
  }, [setMetricsRegistry, setLoadingRegistry]);

  // Load views for current account and refresh upon account change
  useEffect(() => {
    if (selectedAccountId) {
      loadViewsForAccount(selectedAccountId);
    }
  }, [selectedAccountId, accountChangeTimestamp, loadViewsForAccount]);
  
  // Auto-save when changes are made
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveCurrentView();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDirty, saveCurrentView]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Controls: Filters + Views + Add Widget */}
      <div className="flex items-center gap-3 p-4 border-b">
        <GlobalFilters className="p-0 border-0" />
        <div className="ml-auto flex items-center gap-2">
          <ViewsManager />
          <Button onClick={() => setAddWidgetModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
        </div>
      </div>
      
      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto bg-muted/40">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first widget to start tracking metrics
              </p>
              <Button onClick={() => setAddWidgetModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>
            </div>
          </div>
        ) : (
          <DashboardGrid className="p-4" />
        )}
      </div>
      
      {/* Metric Selector Modal */}
      <MetricSelector 
        open={isAddWidgetModalOpen} 
        onOpenChange={setAddWidgetModalOpen} 
      />
    </div>
  );
}
