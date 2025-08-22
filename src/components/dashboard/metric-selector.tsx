"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Target,
  Star,
  Plus,
  Check,
  X,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
} from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { MetricDefinition, VizType, BreakdownType } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface MetricSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  Revenue: <DollarSign className="h-4 w-4" />,
  Appointments: <Calendar className="h-4 w-4" />,
  Pipeline: <TrendingUp className="h-4 w-4" />,
  Quality: <Target className="h-4 w-4" />,
  Team: <Users className="h-4 w-4" />,
  "Compare Mode": <Users className="h-4 w-4" />,
  General: <Activity className="h-4 w-4" />,
};

// Visualization type labels and icons
const vizTypeConfig: Record<VizType, { label: string; icon: React.ReactNode; description: string }> = {
  kpi: { label: "KPI Tile", icon: <Zap className="h-4 w-4" />, description: "Single value display" },
  line: { label: "Line Chart", icon: <LineChart className="h-4 w-4" />, description: "Trends over time" },
  bar: { label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" />, description: "Compare values" },
  area: { label: "Area Chart", icon: <Activity className="h-4 w-4" />, description: "Filled line chart" },
  radar: { label: "Radar Chart", icon: <PieChart className="h-4 w-4" />, description: "Multi-dimensional" },
};

// Derive sensible visualization defaults when none are provided by the registry
function getRecommendedVizFromBreakdowns(breakdowns: BreakdownType[]): VizType[] {
  if (breakdowns.includes("time")) return ["line", "bar", "area", "kpi"];
  if (breakdowns.includes("total")) return ["line", "bar", "area", "kpi"]; // Allow time visuals for totals too
  return ["line", "bar", "area", "kpi"];
}

const FAVORITES_KEY = "promethean.metric.favorites";
const RECENTS_KEY = "promethean.metric.recents";

export function MetricSelector({ open, onOpenChange }: MetricSelectorProps) {
  const { metricsRegistry, addWidget } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricDefinition[]>([]);
  const [selectedViz, setSelectedViz] = useState<VizType | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownType | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "favorites" | "recent">("all");
  const [favoriteMetricNames, setFavoriteMetricNames] = useState<string[]>([]);
  const [recentMetricNames, setRecentMetricNames] = useState<string[]>([]);
  const [isCumulative, setIsCumulative] = useState(false);

  // Load favorites/recents from localStorage
  useEffect(() => {
    try {
      const fav = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      const rec = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
      setFavoriteMetricNames(Array.isArray(fav) ? fav : []);
      setRecentMetricNames(Array.isArray(rec) ? rec : []);
    } catch {}
  }, []);

  const saveFavorites = (next: string[]) => {
    setFavoriteMetricNames(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {}
  };

  const pushRecent = (names: string[]) => {
    const first = names[0];
    const next = [first, ...recentMetricNames.filter((n) => n !== first)].slice(0, 8);
    setRecentMetricNames(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  };

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    const grouping = metricsRegistry.reduce((acc, metric) => {
      if (!acc[metric.category]) acc[metric.category] = [] as MetricDefinition[];
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<string, MetricDefinition[]>);

    // Stable sort by display name
    Object.values(grouping).forEach((arr) => arr.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    return grouping;
  }, [metricsRegistry]);

  // Filter by search and mode
  const filteredGroupedMetrics = useMemo(() => {
    const matchesSearch = (m: MetricDefinition) =>
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());

    const passesMode = (m: MetricDefinition) => {
      if (filterMode === "favorites") return favoriteMetricNames.includes(m.name);
      if (filterMode === "recent") return recentMetricNames.includes(m.name);
      return true;
    };

    return Object.entries(groupedMetrics).reduce((acc, [category, metrics]) => {
      const filtered = metrics.filter((m) => matchesSearch(m) && passesMode(m));
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    }, {} as Record<string, MetricDefinition[]>);
  }, [groupedMetrics, searchQuery, filterMode, favoriteMetricNames, recentMetricNames]);

  const getDefaultBreakdownForViz = (viz: VizType): BreakdownType => {
    switch (viz) {
      case 'kpi':
        return 'total';
      case 'line':
        return 'total'; // Engine can adjust to time
      case 'bar':
        return 'total';
      case 'area':
        return 'total';
      case 'radar':
        return 'total';
      default:
        return 'total';
    }
  };

  const handleMetricSelect = (metric: MetricDefinition) => {
    setSelectedMetric(metric);
    const fallbacks = getRecommendedVizFromBreakdowns(metric.supportedBreakdowns);
    const initialViz = (metric as any).recommendedVisualizations?.[0] || fallbacks[0] || 'kpi';
    setSelectedViz(initialViz as VizType);
    setSelectedBreakdown(getDefaultBreakdownForViz(initialViz as VizType));
    // Initialize multi-selection with first pick
    setSelectedMetrics([metric]);
    setIsCumulative(false);
  };

  const toggleMultiMetric = (metric: MetricDefinition) => {
    setSelectedMetrics((prev) => {
      const exists = prev.find((m) => m.name === metric.name);
      if (exists) return prev.filter((m) => m.name !== metric.name);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, metric];
    });
  };

  const handleVizChange = (viz: VizType) => {
    setSelectedViz(viz);
    setSelectedBreakdown(getDefaultBreakdownForViz(viz));
    // Reset cumulative if switching to KPI
    if (viz === 'kpi') setIsCumulative(false);
  };

  const handleAddWidget = () => {
    if (!selectedMetric || !selectedViz || !selectedBreakdown) return;

    const names = (selectedViz === 'kpi') ? [selectedMetric.name] : selectedMetrics.map((m) => m.name);

    addWidget({
      metricName: names[0],
      metricNames: names.length > 1 ? names : undefined,
      breakdown: selectedBreakdown,
      vizType: selectedViz,
      settings: {
        title: customTitle || selectedMetric.displayName,
        cumulative: isCumulative,
      },
      position: { x: 0, y: 0 },
      size: { w: 4, h: 4 },
    });

    // Update recents
    pushRecent(names);

    // Reset state
    setSelectedMetric(null);
    setSelectedMetrics([]);
    setSelectedViz(null);
    setSelectedBreakdown(null);
    setCustomTitle("");
    setIsCumulative(false);
    onOpenChange(false);
  };

  const toggleFavorite = (metricName: string) => {
    const isFav = favoriteMetricNames.includes(metricName);
    const next = isFav ? favoriteMetricNames.filter((n) => n !== metricName) : [...favoriteMetricNames, metricName];
    saveFavorites(next);
  };

  // Keyboard: Enter to add when configuration is complete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedMetric && selectedViz && selectedBreakdown) {
        e.preventDefault();
        handleAddWidget();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetric, selectedViz, selectedBreakdown, customTitle]);

  // Check if metric is eligible for cumulative mode
  const isCumulativeEligible = useMemo(() => {
    if (!selectedMetric || selectedViz === 'kpi' || selectedMetrics.length > 1) return false;
    const primaryName = selectedMetric.name.toLowerCase();
    return primaryName.includes('revenue') || primaryName.includes('cash');
  }, [selectedMetric, selectedViz, selectedMetrics.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-8 py-6 border-b bg-gradient-to-r from-background to-muted/20">
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold">Add Metric Widget</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Choose a metric and configure how you want to visualize it on your dashboard.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Metric Selection */}
          <div className="flex-1 flex flex-col border-r bg-background">
            {/* Search and Filters */}
            <div className="p-8 border-b bg-muted/20">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  size="default" 
                  variant={filterMode === "all" ? "default" : "outline"} 
                  onClick={() => setFilterMode("all")}
                  className="h-10"
                >
                  All
                </Button>
                <Button 
                  size="default" 
                  variant={filterMode === "favorites" ? "default" : "outline"} 
                  onClick={() => setFilterMode("favorites")}
                  className="gap-2 h-10"
                >
                  <Star className="h-4 w-4" />
                  Favorites
                </Button>
                <Button 
                  size="default" 
                  variant={filterMode === "recent" ? "default" : "outline"} 
                  onClick={() => setFilterMode("recent")}
                  className="h-10"
                >
                  Recent
                </Button>
              </div>
            </div>

            {/* Metrics List */}
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-8">
                {Object.entries(filteredGroupedMetrics).map(([category, metrics]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                      {categoryIcons[category]}
                      <span>{category}</span>
                    </div>
                    <div className="grid gap-4">
                      {metrics.map((metric) => {
                        const isPrimary = selectedMetric?.name === metric.name;
                        const isSelected = selectedMetrics.some((m) => m.name === metric.name);
                        const isFav = favoriteMetricNames.includes(metric.name);
                        const canMultiSelect = selectedViz && selectedViz !== 'kpi';
                        
                        return (
                          <Card 
                            key={metric.name}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md border-2",
                              isPrimary ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            )}
                            onClick={() => handleMetricSelect(metric)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start gap-5">
                                {canMultiSelect && (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleMultiMetric(metric)}
                                    disabled={!isSelected && selectedMetrics.length >= 3}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1.5 scale-125"
                                  />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h4 className="font-semibold text-lg leading-none">{metric.displayName}</h4>
                                    {isPrimary && <Check className="h-5 w-5 text-primary" />}
                                  </div>
                                  <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                                    {metric.description}
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex gap-2">
                                      {metric.supportedBreakdowns.map((breakdown) => (
                                        <Badge key={breakdown} variant="outline" className="text-sm px-3 py-1">
                                          {breakdown}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <Button
                                  variant={isFav ? "default" : "ghost"}
                                  size="icon"
                                  className="h-10 w-10 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(metric.name);
                                  }}
                                >
                                  <Star className={cn("h-5 w-5", isFav && "fill-current")} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {Object.keys(filteredGroupedMetrics).length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-xl text-muted-foreground mb-3">No metrics found</div>
                    <div className="text-base text-muted-foreground">Try adjusting your search or filter</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Configuration */}
          <div className="w-[500px] flex flex-col bg-muted/20">
            {!selectedMetric ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium">Select a metric</h3>
                    <p className="text-base text-muted-foreground mt-3">
                      Choose a metric from the left to configure your widget
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Selected Metric Header */}
                <div className="p-8 border-b bg-gradient-to-br from-background to-primary/5">
                  <div className="text-base text-muted-foreground mb-2">Configuring</div>
                  <h3 className="text-2xl font-semibold text-foreground">{selectedMetric.displayName}</h3>
                  <p className="text-base text-muted-foreground mt-3 leading-relaxed">{selectedMetric.description}</p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-8 space-y-8">
                    {/* Selected Metrics (Multi-select) */}
                    {selectedViz && selectedViz !== 'kpi' && selectedMetrics.length > 0 && (
                      <Card>
                        <CardHeader className="pb-6">
                          <CardTitle className="text-lg">Selected Metrics ({selectedMetrics.length}/3)</CardTitle>
                          <CardDescription className="text-base">
                            Compare multiple metrics on the same chart
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-3">
                            {selectedMetrics.map((metric) => (
                              <Badge key={metric.name} variant="secondary" className="flex items-center gap-3 px-4 py-3 text-base">
                                <span>{metric.displayName}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                  onClick={() => toggleMultiMetric(metric)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Visualization Type */}
                    <Card>
                      <CardHeader className="pb-6">
                        <CardTitle className="text-lg">Visualization Type</CardTitle>
                        <CardDescription className="text-base">
                          How should this metric be displayed?
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 gap-4">
                          {(Object.entries(vizTypeConfig) as [VizType, typeof vizTypeConfig[VizType]][]).map(([viz, config]) => (
                            <Button
                              key={viz}
                              variant={selectedViz === viz ? "default" : "outline"}
                              className="justify-start h-auto p-5"
                              onClick={() => handleVizChange(viz)}
                            >
                              <div className="flex items-center gap-4">
                                {config.icon}
                                <div className="text-left">
                                  <div className="font-semibold text-base">{config.label}</div>
                                  <div className="text-sm text-muted-foreground">{config.description}</div>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cumulative Toggle */}
                    {isCumulativeEligible && (
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="text-lg font-medium">Cumulative Mode</div>
                              <div className="text-base text-muted-foreground">
                                Show running total that compounds over time
                              </div>
                            </div>
                            <Switch 
                              checked={isCumulative} 
                              onCheckedChange={setIsCumulative}
                              className="scale-125"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Custom Title */}
                    <Card>
                      <CardHeader className="pb-6">
                        <CardTitle className="text-lg">Widget Title</CardTitle>
                        <CardDescription className="text-base">
                          Customize the title that appears on your widget
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Input 
                          value={customTitle} 
                          onChange={(e) => setCustomTitle(e.target.value)} 
                          placeholder={selectedMetric.displayName}
                          className="w-full h-12 text-base"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-8 border-t bg-background/80 backdrop-blur">
                  <div className="flex items-center justify-between gap-6">
                    <div className="text-base text-muted-foreground">
                      Press Enter to add quickly
                    </div>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-6"
                        onClick={() => {
                          setSelectedMetric(null);
                          setSelectedMetrics([]);
                          setSelectedViz(null);
                          setSelectedBreakdown(null);
                          setCustomTitle("");
                          setIsCumulative(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button 
                        onClick={handleAddWidget} 
                        disabled={!selectedViz || !selectedBreakdown}
                        className="gap-3 h-12 px-8"
                        size="lg"
                      >
                        <Plus className="h-5 w-5" />
                        Add Widget
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 