"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GlobalFilters } from "@/components/dashboard/global-filters";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import { useDashboardStore } from "@/lib/dashboard/store";
import { MetricDefinition, BreakdownType, VizType } from "@/lib/dashboard/types";

// Mock metrics registry for demo
const mockMetricsRegistry: MetricDefinition[] = [
  {
    name: "revenue_total",
    displayName: "Total Revenue",
    description: "Total revenue across all sources",
    category: "Revenue",
    supportedBreakdowns: ["total", "time", "rep", "setter"],
    recommendedVisualizations: ["kpi", "line", "bar"],
    formula: "SUM(appointment_value)",
    unit: "$"
  },
  {
    name: "appointments_total",
    displayName: "Total Appointments",
    description: "Total number of appointments",
    category: "Appointments",
    supportedBreakdowns: ["total", "time", "rep", "setter"],
    recommendedVisualizations: ["kpi", "line", "bar"],
    formula: "COUNT(appointments)"
  },
  {
    name: "show_rate",
    displayName: "Show Rate",
    description: "Percentage of scheduled appointments that showed",
    category: "Quality",
    supportedBreakdowns: ["total", "rep", "setter"],
    recommendedVisualizations: ["kpi", "bar"],
    formula: "COUNT(showed) / COUNT(scheduled) * 100",
    unit: "%"
  },
  {
    name: "close_rate",
    displayName: "Close Rate",
    description: "Percentage of appointments that resulted in a sale",
    category: "Quality",
    supportedBreakdowns: ["total", "rep", "setter", "link"],
    recommendedVisualizations: ["kpi", "bar", "funnel"],
    formula: "COUNT(closed) / COUNT(showed) * 100",
    unit: "%"
  },
  {
    name: "revenue_per_appointment",
    displayName: "Revenue per Appointment",
    description: "Average revenue generated per appointment",
    category: "Revenue",
    supportedBreakdowns: ["total", "rep", "setter"],
    recommendedVisualizations: ["kpi", "bar", "table"],
    formula: "SUM(revenue) / COUNT(appointments)",
    unit: "$"
  }
];

export default function DashboardPage() {
  const { 
    isAddWidgetModalOpen, 
    setAddWidgetModalOpen,
    setMetricsRegistry,
    widgets,
    isDirty,
    saveCurrentView
  } = useDashboardStore();
  
  // Initialize metrics registry
  useEffect(() => {
    setMetricsRegistry(mockMetricsRegistry);
  }, [setMetricsRegistry]);
  
  // Auto-save when changes are made
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveCurrentView();
      }, 2000); // Save after 2 seconds of no changes
      
      return () => clearTimeout(timer);
    }
  }, [isDirty, saveCurrentView]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Metrics Dashboard</h1>
          <p className="text-muted-foreground">
            Track and analyze your team's performance
          </p>
        </div>
        <Button onClick={() => setAddWidgetModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </div>
      
      {/* Global Filters */}
      <GlobalFilters />
      
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
