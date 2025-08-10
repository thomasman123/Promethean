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
    setSelectedViz(metric.recommendedVisualizations[0] || "kpi");
    setSelectedBreakdown(metric.supportedBreakdowns[0] || "total");
  };

  const handleAddWidget = () => {
    if (!selectedMetric || !selectedViz || !selectedBreakdown) return;

    addWidget({
      metricName: selectedMetric.name,
      breakdown: selectedBreakdown,
      vizType: selectedViz,
      settings: {
        title: customTitle || selectedMetric.displayName,
      },
      position: { x: 0, y: 0 }, // Will be auto-positioned
      size: { w: 4, h: 4 }, // Default size
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
  }, [selectedMetric, selectedViz, selectedBreakdown, customTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <div className="border-b px-6 py-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl">Add Metric Widget</DialogTitle>
            <DialogDescription>Select a metric, then configure how it appears.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* Left: Metric Browser */}
          <div className="col-span-7 border-r flex flex-col">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <div className="flex-1">
                <Command shouldFilter={false} className="rounded-lg border">
                  <div className="flex items-center px-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <CommandInput
                      placeholder="Search metrics..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                  </div>
                  <CommandSeparator />
                  <div className="px-3 py-2 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={filterMode === "all" ? "default" : "outline"}
                      onClick={() => setFilterMode("all")}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={filterMode === "favorites" ? "default" : "outline"}
                      onClick={() => setFilterMode("favorites")}
                      className="gap-1"
                    >
                      <Star className="h-3 w-3" /> Favorites
                    </Button>
                    <Button
                      size="sm"
                      variant={filterMode === "recent" ? "default" : "outline"}
                      onClick={() => setFilterMode("recent")}
                    >
                      Recent
                    </Button>
                  </div>
                  <CommandSeparator />
                  <CommandList className="max-h-[48vh]">
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
                              className={cn(
                                "flex items-start justify-between gap-3 px-3 py-3",
                                isActive && "bg-primary/5"
                              )}
                            >
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium leading-none">{metric.displayName}</div>
                                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {metric.description}
                                </div>
                                {metric.formula && (
                                  <div className="text-[11px] font-mono text-muted-foreground mt-2">
                                    {metric.formula}
                                  </div>
                                )}
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
          </div>

          {/* Right: Configuration & Preview */}
          <div className="col-span-5 flex flex-col">
            {!selectedMetric ? (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <div className="mx-auto mb-3 h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="font-medium">Pick a metric to configure</div>
                  <div className="text-sm text-muted-foreground mt-1">Search or browse on the left. Press Enter to add when ready.</div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="px-6 pt-5 pb-4 border-b">
                  <div className="text-sm text-muted-foreground">Configuring</div>
                  <div className="text-lg font-semibold leading-tight">{selectedMetric.displayName}</div>
                  {selectedMetric.unit && (
                    <div className="text-xs text-muted-foreground mt-1">Unit: {selectedMetric.unit}</div>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="px-6 py-4 space-y-5">
                    {/* Visualization Type - segmented buttons */}
                    <div>
                      <div className="text-sm font-medium mb-2">Visualization</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMetric.recommendedVisualizations.map((viz) => (
                          <Button
                            key={viz}
                            type="button"
                            variant={selectedViz === viz ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedViz(viz)}
                          >
                            {vizTypeLabels[viz]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown Type - chip select */}
                    <div>
                      <div className="text-sm font-medium mb-2">Breakdown</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMetric.supportedBreakdowns.map((b) => (
                          <Button
                            key={b}
                            type="button"
                            variant={selectedBreakdown === b ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedBreakdown(b)}
                          >
                            {b.charAt(0).toUpperCase() + b.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Title */}
                    <div>
                      <div className="text-sm font-medium mb-2">Custom Title (optional)</div>
                      <Input
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder={selectedMetric.displayName}
                      />
                    </div>

                    {/* Lightweight Preview */}
                    <div>
                      <div className="text-sm font-medium mb-2">Preview</div>
                      <div className="rounded-md border bg-muted/30 p-4">
                        <div className="text-sm font-medium mb-1">{customTitle || selectedMetric.displayName}</div>
                        <div className="text-xs text-muted-foreground mb-3">
                          {vizTypeLabels[selectedViz as VizType]} · {selectedBreakdown}
                        </div>
                        <div className="h-28 rounded bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-xs text-muted-foreground">
                          Preview placeholder
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="px-6 py-4 border-t mt-auto flex items-center justify-between gap-3">
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
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleAddWidget}
                      disabled={!selectedViz || !selectedBreakdown}
                    >
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