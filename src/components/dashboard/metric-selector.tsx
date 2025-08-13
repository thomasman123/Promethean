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
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
};

// Visualization type labels
const vizTypeLabels: Record<VizType, string> = {
  kpi: "KPI Tile",
  line: "Line Chart"
};

// Derive sensible visualization defaults when none are provided by the registry
function getRecommendedVizFromBreakdowns(breakdowns: BreakdownType[]): VizType[] {
  if (breakdowns.includes("time")) return ["line", "kpi"];
  if (breakdowns.includes("total")) return ["kpi", "line"]; // Allow line charts for total metrics too
  return ["line", "kpi"];
}

const FAVORITES_KEY = "promethean.metric.favorites";
const RECENTS_KEY = "promethean.metric.recents";

export function MetricSelector({ open, onOpenChange }: MetricSelectorProps) {
  const { metricsRegistry, addWidget } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [selectedViz, setSelectedViz] = useState<VizType | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownType | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "favorites" | "recent">("all");
  const [favoriteMetricNames, setFavoriteMetricNames] = useState<string[]>([]);
  const [recentMetricNames, setRecentMetricNames] = useState<string[]>([]);

  // Advanced display options
  const [yAxisScale, setYAxisScale] = useState<"linear" | "log">("linear");
  const [showRollingAvg, setShowRollingAvg] = useState(false);
  const [rollingAvgDays, setRollingAvgDays] = useState(7);
  const [compareVsPrevious, setCompareVsPrevious] = useState(false);
  const [previousPeriodType, setPreviousPeriodType] = useState<"day" | "week" | "month" | "year">("week");

  // Map viz to default breakdown
  const getDefaultBreakdownForViz = (viz: VizType): BreakdownType => {
    switch (viz) {
      case 'kpi':
        return 'total';
      case 'line':
        return 'total'; // Use total breakdown, engine will convert to time automatically
      default:
        return 'total';
    }
  };

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

  const pushRecent = (name: string) => {
    const next = [name, ...recentMetricNames.filter((n) => n !== name)].slice(0, 8);
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

  const handleMetricSelect = (metric: MetricDefinition) => {
    setSelectedMetric(metric);
    const fallbacks = getRecommendedVizFromBreakdowns(metric.supportedBreakdowns);
    const initialViz = (metric as any).recommendedVisualizations?.[0] || fallbacks[0] || 'kpi';
    setSelectedViz(initialViz as VizType);
    setSelectedBreakdown(getDefaultBreakdownForViz(initialViz as VizType));
  };

  const handleVizChange = (viz: VizType) => {
    setSelectedViz(viz);
    setSelectedBreakdown(getDefaultBreakdownForViz(viz));
  };

  const handleAddWidget = () => {
    if (!selectedMetric || !selectedViz || !selectedBreakdown) return;

    addWidget({
      metricName: selectedMetric.name,
      breakdown: selectedBreakdown,
      vizType: selectedViz,
      settings: {
        title: customTitle || selectedMetric.displayName,
        yAxisScale,
        showRollingAvg,
        rollingAvgDays,
        compareVsPrevious,
        previousPeriodType,
      },
      position: { x: 0, y: 0 },
      size: { w: 4, h: 4 }, // Standard size for 3 widgets per row
    });

    // Update recents
    pushRecent(selectedMetric.name);

    // Reset state
    setSelectedMetric(null);
    setSelectedViz(null);
    setSelectedBreakdown(null);
    setCustomTitle("");
    onOpenChange(false);
  };

  const toggleFavorite = (metricName: string) => {
    const isFav = favoriteMetricNames.includes(metricName);
    const next = isFav
      ? favoriteMetricNames.filter((n) => n !== metricName)
      : [...favoriteMetricNames, metricName];
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
  }, [selectedMetric, selectedViz, selectedBreakdown, customTitle, yAxisScale, showRollingAvg, rollingAvgDays, compareVsPrevious, previousPeriodType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] h-[94vh] max-w-none sm:w-[96vw] sm:h-[94vh] sm:max-w-[96vw] md:max-w-[96vw] lg:max-w-[96vw] xl:max-w-[96vw] 2xl:max-w-[1600px] flex flex-col p-0 overflow-hidden rounded-xl">
        <div className="border-b px-6 py-5 bg-gradient-to-br from-background to-muted/40">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl">Add Metric Widget</DialogTitle>
            <DialogDescription className="text-muted-foreground">Select a metric, then configure how it appears.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* Left: Metric Browser */}
          <div className="col-span-7 border-r flex flex-col bg-background min-h-0">
            <div className="px-4 pt-4 pb-3 flex-1 min-h-0 flex flex-col">
              <Command shouldFilter={false} className="rounded-lg border flex-1 min-h-0">
                <div className="flex items-center px-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput placeholder="Search metrics..." value={searchQuery} onValueChange={setSearchQuery} />
                </div>
                <CommandSeparator />
                <div className="px-3 py-2 flex gap-2 flex-wrap">
                  <Button size="sm" variant={filterMode === "all" ? "default" : "outline"} onClick={() => setFilterMode("all")}>
                    All
                  </Button>
                  <Button size="sm" variant={filterMode === "favorites" ? "default" : "outline"} onClick={() => setFilterMode("favorites")} className="gap-1">
                    <Star className="h-3 w-3" /> Favorites
                  </Button>
                  <Button size="sm" variant={filterMode === "recent" ? "default" : "outline"} onClick={() => setFilterMode("recent")}>
                    Recent
                  </Button>
                </div>
                <CommandSeparator />
                <CommandList className="flex-1 overflow-auto">
                  <CommandEmpty>No metrics found.</CommandEmpty>
                  {Object.entries(filteredGroupedMetrics).map(([category, metrics]) => (
                    <CommandGroup
                      key={category}
                      heading={
                        <div className="flex items-center gap-2 text-sm">
                          {categoryIcons[category]}
                          <span>{category}</span>
                        </div>
                      }
                    >
                      {metrics.map((metric) => {
                        const isActive = selectedMetric?.name === metric.name;
                        const isFav = favoriteMetricNames.includes(metric.name);
                        return (
                          <CommandItem
                            key={metric.name}
                            value={`${metric.displayName} ${metric.description}`}
                            onSelect={() => handleMetricSelect(metric)}
                            className={cn("flex items-start justify-between gap-3 px-3 py-3 rounded-md", isActive && "bg-primary/5")}
                          >
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium leading-none">{metric.displayName}</div>
                                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{metric.description}</div>
                              {metric.formula && <div className="text-[11px] font-mono text-muted-foreground mt-2">{metric.formula}</div>}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {metric.supportedBreakdowns.map((b) => (
                                  <Badge key={b} variant="secondary" className="text-[10px]">
                                    {b}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant={isFav ? "default" : "ghost"}
                              size="icon"
                              className={cn("h-7 w-7 shrink-0", isFav ? "" : "text-muted-foreground")}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(metric.name);
                              }}
                              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className={cn("h-4 w-4", isFav && "fill-current")} />
                            </Button>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </div>
          </div>

          {/* Right: Configuration & Preview */}
          <div className="col-span-5 flex flex-col bg-background">
            {!selectedMetric ? (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-muted flex items-center justify-center shadow-sm">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="font-medium">Pick a metric to configure</div>
                  <div className="text-sm text-muted-foreground mt-1">Search or browse on the left. Press Enter to add when ready.</div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="px-6 pt-5 pb-4 border-b bg-gradient-to-br from-background to-muted/30">
                  <div className="text-sm text-muted-foreground">Configuring</div>
                  <div className="text-lg font-semibold leading-tight">{selectedMetric.displayName}</div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="px-6 py-5 space-y-6">
                    {/* Section: Visualization */}
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">Visualization</div>
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedMetric as any).recommendedVisualizations?.length
                          ? (selectedMetric as any).recommendedVisualizations
                          : getRecommendedVizFromBreakdowns(selectedMetric.supportedBreakdowns)
                        .map((viz: VizType) => (
                          <Button
                            key={viz}
                            type="button"
                            variant={selectedViz === viz ? "default" : "outline"}
                            size="sm"
                            className="rounded-md"
                            onClick={() => handleVizChange(viz)}
                          >
                            {vizTypeLabels[viz]}
                          </Button>
                        ))}
                      </div>

                      {/* All Visualizations */}
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">All visualizations</div>
                        <Badge variant="outline" className="text-xs">Full list</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {([
                          'kpi',
                          'line',
                          'area',
                          'bar',
                          'horizontalBar',
                          'stackedBar',
                          'pie',
                          'donut',
                          'radar',
                          'radialBar',
                          'scatter',
                          'sparkline',
                          'table',
                        ] as VizType[]).map((viz) => (
                          <Button
                            key={`all-${viz}`}
                            type="button"
                            variant={selectedViz === viz ? "default" : "outline"}
                            size="sm"
                            className="rounded-md"
                            onClick={() => handleVizChange(viz)}
                          >
                            {vizTypeLabels[viz]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Section: Title */}
                    <div className="rounded-lg border bg-card p-4">
                      <Label htmlFor="title" className="text-sm font-medium mb-2 block">Custom Title (optional)</Label>
                      <Input id="title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={selectedMetric.displayName} />
                    </div>

                    {/* Section: Advanced options */}
                    <div className="rounded-lg border bg-card">
                      <Collapsible>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="text-sm font-medium">Advanced display options</div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">Toggle</Button>
                          </CollapsibleTrigger>
                        </div>
                        <Separator />
                        <CollapsibleContent>
                          <div className="p-4 grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">Logarithmic y-axis</div>
                                <div className="text-xs text-muted-foreground">Switch to log scale for wide ranges</div>
                              </div>
                              <Switch checked={yAxisScale === "log"} onCheckedChange={(v) => setYAxisScale(v ? "log" : "linear")} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">Show rolling average</div>
                                <div className="text-xs text-muted-foreground">Smooth line and bar charts over time</div>
                              </div>
                              <Switch checked={showRollingAvg} onCheckedChange={setShowRollingAvg} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="ra-days" className="text-xs">Rolling avg days</Label>
                                <Input
                                  id="ra-days"
                                  type="number"
                                  min={3}
                                  max={60}
                                  value={rollingAvgDays}
                                  onChange={(e) => setRollingAvgDays(Number(e.target.value) || 7)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="prev-type" className="text-xs">Previous period</Label>
                                <div className="flex gap-2 mt-1">
                                  {(["day", "week", "month", "year"] as const).map((p) => (
                                    <Button
                                      key={p}
                                      type="button"
                                      size="sm"
                                      variant={previousPeriodType === p ? "default" : "outline"}
                                      onClick={() => setPreviousPeriodType(p)}
                                    >
                                      {p}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">Compare vs previous period</div>
                                <div className="text-xs text-muted-foreground">Display delta vs selected previous period</div>
                              </div>
                              <Switch checked={compareVsPrevious} onCheckedChange={setCompareVsPrevious} />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Section: Preview */}
                    <div className="rounded-lg border bg-card p-4">
                      <div className="text-sm font-medium mb-2">Preview</div>
                      <div className="rounded-md border bg-muted/30 p-4">
                        <div className="text-sm font-medium mb-1">{customTitle || selectedMetric.displayName}</div>
                        <div className="text-xs text-muted-foreground mb-3">
                          {vizTypeLabels[selectedViz as VizType]}
                        </div>
                        <div className="h-32 rounded bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-xs text-muted-foreground">
                          Preview placeholder
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="px-6 py-4 border-t mt-auto flex items-center justify-between gap-3 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                  <div className="text-xs text-muted-foreground">Press Enter to add quickly</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedMetric(null);
                        setSelectedViz(null);
                        setSelectedBreakdown(null);
                        setCustomTitle("");
                        setYAxisScale("linear");
                        setShowRollingAvg(false);
                        setRollingAvgDays(7);
                        setCompareVsPrevious(false);
                        setPreviousPeriodType("week");
                      }}
                    >
                      Clear
                    </Button>
                    <Button onClick={handleAddWidget} disabled={!selectedViz || !selectedBreakdown}>
                      Add Widget
                    </Button>
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