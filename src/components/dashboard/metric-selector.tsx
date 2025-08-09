"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, Calendar, Users, DollarSign, Target } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { MetricDefinition, VizType, BreakdownType } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface MetricSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  "Revenue": <DollarSign className="h-4 w-4" />,
  "Appointments": <Calendar className="h-4 w-4" />,
  "Pipeline": <TrendingUp className="h-4 w-4" />,
  "Quality": <Target className="h-4 w-4" />,
  "Team": <Users className="h-4 w-4" />,
  "Compare Mode": <Users className="h-4 w-4" />,
};

// Visualization type labels
const vizTypeLabels: Record<VizType, string> = {
  kpi: "KPI Tile",
  line: "Line Chart",
  bar: "Bar Chart",
  area: "Area Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  table: "Table",
  funnel: "Funnel",
  compareMatrix: "Comparison Matrix",
  compareTable: "Comparison Table",
};

export function MetricSelector({ open, onOpenChange }: MetricSelectorProps) {
  const { metricsRegistry, addWidget } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [selectedViz, setSelectedViz] = useState<VizType | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownType | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  
  // Group metrics by category
  const groupedMetrics = metricsRegistry.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, MetricDefinition[]>);
  
  // Filter metrics based on search
  const filteredGroupedMetrics = Object.entries(groupedMetrics).reduce((acc, [category, metrics]) => {
    const filtered = metrics.filter(metric => 
      metric.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metric.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, MetricDefinition[]>);
  
  const handleMetricSelect = (metric: MetricDefinition) => {
    setSelectedMetric(metric);
    setSelectedViz(metric.recommendedVisualizations[0] || 'kpi');
    setSelectedBreakdown(metric.supportedBreakdowns[0] || 'total');
  };
  
  const handleAddWidget = () => {
    if (!selectedMetric || !selectedViz || !selectedBreakdown) return;
    
    addWidget({
      metricName: selectedMetric.name,
      breakdown: selectedBreakdown,
      vizType: selectedViz,
      settings: {
        title: customTitle || selectedMetric.displayName
      },
      position: { x: 0, y: 0 }, // Will be auto-positioned
      size: { w: 4, h: 4 } // Default size
    });
    
    // Reset state
    setSelectedMetric(null);
    setSelectedViz(null);
    setSelectedBreakdown(null);
    setCustomTitle("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Metric Widget</DialogTitle>
          <DialogDescription>
            Select a metric to display on your dashboard
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex gap-4">
          {/* Metric Selection */}
          <div className="flex-1 flex flex-col">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="flex-1">
              {Object.entries(filteredGroupedMetrics).map(([category, metrics]) => (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {categoryIcons[category]}
                    <h3 className="font-semibold text-sm">{category}</h3>
                  </div>
                  <div className="space-y-2">
                    {metrics.map((metric) => (
                      <button
                        key={metric.name}
                        onClick={() => handleMetricSelect(metric)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          selectedMetric?.name === metric.name
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-muted"
                        )}
                      >
                        <div className="font-medium text-sm">{metric.displayName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {metric.description}
                        </div>
                        {metric.formula && (
                          <div className="text-xs font-mono text-muted-foreground mt-2">
                            {metric.formula}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          
          {/* Configuration Panel */}
          {selectedMetric && (
            <div className="w-80 border-l pl-4 flex flex-col">
              <h3 className="font-semibold mb-4">Configure Widget</h3>
              
              <div className="space-y-4">
                {/* Visualization Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Visualization
                  </label>
                  <Select value={selectedViz || ""} onValueChange={(v) => setSelectedViz(v as VizType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetric.recommendedVisualizations.map((viz) => (
                        <SelectItem key={viz} value={viz}>
                          <div className="flex items-center gap-2">
                            {vizTypeLabels[viz]}
                            {selectedMetric.recommendedVisualizations[0] === viz && (
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Breakdown Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Breakdown
                  </label>
                  <Select value={selectedBreakdown || ""} onValueChange={(v) => setSelectedBreakdown(v as BreakdownType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMetric.supportedBreakdowns.map((breakdown) => (
                        <SelectItem key={breakdown} value={breakdown}>
                          {breakdown.charAt(0).toUpperCase() + breakdown.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Custom Title */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Custom Title (optional)
                  </label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={selectedMetric.displayName}
                  />
                </div>
              </div>
              
              <div className="mt-auto pt-4">
                <Button
                  onClick={handleAddWidget}
                  className="w-full"
                  disabled={!selectedViz || !selectedBreakdown}
                >
                  Add Widget
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 