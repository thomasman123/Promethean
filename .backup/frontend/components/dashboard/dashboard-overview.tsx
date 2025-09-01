"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DashboardGrid } from "./dashboard-grid";
import { GeographicVisualization } from "./geographic-visualization";
import { useDashboardStore } from "@/lib/dashboard/store";
import { cn } from "@/lib/utils";

interface DashboardOverviewProps {
  className?: string;
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const { widgets, setAddWidgetModalOpen } = useDashboardStore();

  return (
    <div className={cn("flex-1 space-y-6", className)}>
      {/* Enhanced Dashboard Grid */}
      <div className="px-4 lg:px-6 py-4">
        <div className="dashboard-card p-4 lg:p-6">
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 fade-in">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Create Your First Widget</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Start building your dashboard by adding widgets to track your key metrics and performance indicators.
                  </p>
                </div>
                <Button 
                  onClick={() => setAddWidgetModalOpen(true)} 
                  className="btn-primary gap-2 scale-in"
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Widget
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* KPI Widgets Section */}
              <div className="slide-up">
                <h2 className="section-header">Key Performance Indicators</h2>
                <DashboardGrid className="dashboard-grid" />
              </div>

              {/* Charts & Visualizations Section */}
              <div className="slide-up" style={{ animationDelay: '200ms' }}>
                <h2 className="section-header">Geographic Performance</h2>
                <GeographicVisualization />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 