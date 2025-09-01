"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { GlobalFilters } from "@/components/dashboard/global-filters";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import { ViewsManager } from "@/components/dashboard/views-manager";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardDetailed } from "@/components/dashboard/dashboard-detailed";
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
    if (name.includes('booking_lead_time')) return 'Quality';
    if (name.includes('appointment')) return 'Appointments';
    if (name.includes('show') || name.includes('rate')) return 'Quality';
    if (name.includes('revenue') || name.includes('deal')) return 'Revenue';
    return 'General';
  };

  return {
    name: engineMetric.name,
    displayName: engineMetric.name, // Use name as displayName since metrics don't have displayName
    description: engineMetric.description,
    category: getCategory(engineMetric.name),
    supportedBreakdowns: getBreakdowns(engineMetric.breakdownType),
    recommendedVisualizations: getRecommendedViz(engineMetric.breakdownType),
    formula: `${engineMetric.breakdownType} breakdown query`
  };
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
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
    <div className="flex flex-col min-h-screen">
      {/* Enhanced Header with Tabs */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 lg:px-6 py-3">
          <GlobalFilters className="p-0 border-0 flex-1 sm:flex-none" />
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            <ViewsManager />
            <Button 
              onClick={() => setAddWidgetModalOpen(true)} 
              className="btn-primary gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="dashboard-tab data-[state=active]:active"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="detailed" 
                className="dashboard-tab data-[state=active]:active"
              >
                Detailed Data
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
        
      {/* Tab Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsContent value="overview" className="mt-0 h-full">
            <DashboardOverview />
          </TabsContent>
          
          <TabsContent value="detailed" className="mt-0 h-full">
            <DashboardDetailed />
          </TabsContent>
        </Tabs>
      </div>
       
      {/* Metric Selector Modal */}
      <MetricSelector 
        open={isAddWidgetModalOpen} 
        onOpenChange={setAddWidgetModalOpen} 
      />
    </div>
  );
}
