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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step validation helpers
  const isTimeViz = selectedViz && selectedViz !== 'kpi';
  const isStep1Valid = !!selectedViz;
  const isStep2Valid = selectedViz === 'kpi' ? selectedMetrics.length === 1 : selectedMetrics.length >= 1 && selectedMetrics.length <= 3;

  const gotoNext = () => {
    if (step === 1 && !isStep1Valid) return;
    if (step === 2 && !isStep2Valid) return;
    setStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 4));
  };
  const gotoBack = () => setStep((prev) => (prev === 4 ? 3 : prev === 3 ? 2 : 1));
  const gotoPublish = () => handleAddWidget();

  // Reset flow on open
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

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
    // For KPI, enforce single selection
    if (viz === 'kpi' && selectedMetrics.length > 1) {
      setSelectedMetrics((prev) => (prev.length > 0 ? [prev[0]] : []));
    }
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
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (step < 4) gotoNext(); else gotoPublish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedMetric, selectedViz, selectedBreakdown, customTitle, isStep1Valid, isStep2Valid]);

  // Check if metric is eligible for cumulative mode
  const isCumulativeEligible = useMemo(() => {
    if (!selectedMetric || selectedViz === 'kpi' || selectedMetrics.length > 1) return false;
    const primaryName = selectedMetric.name.toLowerCase();
    return primaryName.includes('revenue') || primaryName.includes('cash');
  }, [selectedMetric, selectedViz, selectedMetrics.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-[92vw] md:max-w-[92vw] lg:max-w-[92vw] xl:max-w-[90vw] 2xl:max-w-[88vw] w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-3 border-b bg-gradient-to-r from-background to-muted/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add Metric Widget</DialogTitle>
            <DialogDescription className="text-xs">
              Choose a metric and configure how you want to visualize it on your dashboard.
            </DialogDescription>
          </DialogHeader>
          {/* Stepper */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            {[
              { n: 1, label: 'Visualization' },
              { n: 2, label: 'Metrics' },
              { n: 3, label: 'Settings' },
              { n: 4, label: 'Review' },
            ].map((s) => (
              <div key={s.n} className={cn('flex items-center gap-2', s.n !== 4 && 'pr-2 border-r')}
                   onClick={() => setStep(s.n as 1|2|3|4)}>
                <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[10px]', step >= s.n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{s.n}</div>
                <span className={cn('font-medium', step === s.n ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel (varies by step) */}
          <div className="flex-1 flex flex-col border-r bg-background min-h-0">
            {/* Step 2: Search and Metrics */}
            {step === 2 && (
            <div className="p-4 border-b bg-muted/20">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={filterMode === "all" ? "default" : "outline"} 
                  onClick={() => setFilterMode("all")}
                  className="h-7"
                >
                  All
                </Button>
                <Button 
                  size="sm" 
                  variant={filterMode === "favorites" ? "default" : "outline"} 
                  onClick={() => setFilterMode("favorites")}
                  className="gap-1.5 h-7"
                >
                  <Star className="h-3.5 w-3.5" />
                  Favorites
                </Button>
                <Button 
                  size="sm" 
                  variant={filterMode === "recent" ? "default" : "outline"} 
                  onClick={() => setFilterMode("recent")}
                  className="h-7"
                >
                  Recent
                </Button>
              </div>
            </div>
            )}

            {/* Step 1: Visualization picker (left side placeholder to balance layout) */}
            {step === 1 && (
              <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground">Choose a visualization on the right to continue.</div>
            )}

            {/* Step 3: Settings (left takes full area for compact layout) */}
            {step === 3 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Cumulative Toggle */}
                {isCumulativeEligible && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Cumulative Mode</div>
                          <div className="text-xs text-muted-foreground">Show running total that compounds over time</div>
                        </div>
                        <Switch checked={isCumulative} onCheckedChange={setIsCumulative} />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Title */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Widget Title</CardTitle>
                    <CardDescription className="text-xs">Customize the title for your widget</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={selectedMetric?.displayName || 'Title'} className="w-full h-9 text-sm" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="flex-1 overflow-y-auto p-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Review</CardTitle>
                    <CardDescription className="text-xs">Confirm your configuration before adding</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Visualization:</span> <span className="ml-1 font-medium">{selectedViz || '-'}</span></div>
                    <div><span className="text-muted-foreground">Metrics:</span> <span className="ml-1 font-medium">{(selectedViz === 'kpi' ? (selectedMetrics[0]?.displayName || '-') : selectedMetrics.map(m=>m.displayName).join(', ') ) || '-'}</span></div>
                    <div><span className="text-muted-foreground">Cumulative:</span> <span className="ml-1 font-medium">{isCumulative ? 'On' : 'Off'}</span></div>
                    <div><span className="text-muted-foreground">Title:</span> <span className="ml-1 font-medium">{customTitle || selectedMetric?.displayName || '-'}</span></div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2 Metrics List body */}
            {step === 2 && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {Object.entries(filteredGroupedMetrics).map(([category, metrics]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {categoryIcons[category]}
                      <span>{category}</span>
                    </div>
                    <div className="grid gap-2">
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
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                {canMultiSelect && (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleMultiMetric(metric)}
                                    disabled={!isSelected && selectedMetrics.length >= 3}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-0.5"
                                  />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-medium text-sm leading-none">{metric.displayName}</h4>
                                    {isPrimary && <Check className="h-4 w-4 text-primary" />}
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">
                                    {metric.description}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      {metric.supportedBreakdowns.map((breakdown) => (
                                        <Badge key={breakdown} variant="outline" className="text-[10px] px-1.5 py-0.5">
                                          {breakdown}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <Button
                                  variant={isFav ? "default" : "ghost"}
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(metric.name);
                                  }}
                                >
                                  <Star className={cn("h-4 w-4", isFav && "fill-current")} />
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
                  <div className="text-center py-8">
                    <div className="text-base text-muted-foreground mb-2">No metrics found</div>
                    <div className="text-sm text-muted-foreground">Try adjusting your search or filter</div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Right Panel: varies by step */}
          <div className="w-[380px] flex flex-col bg-muted/20 min-h-0">
            {!selectedMetric ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium">Select a metric</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a metric from the left to configure your widget
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Selected Metric Header */}
                <div className="p-4 border-b bg-gradient-to-br from-background to-primary/5">
                  <div className="text-xs text-muted-foreground mb-1">Configuring</div>
                  <h3 className="text-base font-semibold text-foreground">{selectedMetric.displayName}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{selectedMetric.description}</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Step 2: Selected Metrics (Multi-select) */}
                    {step === 2 && selectedViz && selectedViz !== 'kpi' && selectedMetrics.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Selected Metrics ({selectedMetrics.length}/3)</CardTitle>
                          <CardDescription className="text-xs">
                            Compare multiple metrics on the same chart
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="flex flex-wrap gap-2">
                            {selectedMetrics.map((metric) => (
                              <Badge key={metric.name} variant="secondary" className="flex items-center gap-1.5 px-2 py-1 text-xs">
                                <span>{metric.displayName}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                  onClick={() => toggleMultiMetric(metric)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Step 1: Visualization Type */}
                    {step === 1 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Visualization Type</CardTitle>
                          <CardDescription className="text-xs">How should this metric be displayed?</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="grid grid-cols-1 gap-1.5">
                            {(Object.entries(vizTypeConfig) as [VizType, typeof vizTypeConfig[VizType]][]).map(([viz, config]) => (
                              <Button key={viz} variant={selectedViz === viz ? 'default' : 'outline'} className="justify-start h-auto p-2.5" onClick={() => handleVizChange(viz)}>
                                <div className="flex items-center gap-2.5">
                                  {config.icon}
                                  <div className="text-left">
                                    <div className="font-medium text-sm">{config.label}</div>
                                    <div className="text-xs text-muted-foreground">{config.description}</div>
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Step 3 Settings live on left; show a compact summary here instead */}
                    {step === 3 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Settings Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1 text-xs text-muted-foreground">
                          <div>Title: <span className="text-foreground font-medium">{customTitle || selectedMetric.displayName}</span></div>
                          {isTimeViz && <div>Cumulative: <span className="text-foreground font-medium">{isCumulative ? 'On' : 'Off'}</span></div>}
                        </CardContent>
                      </Card>
                    )}

                    {step === 4 && (
                      <div className="text-xs text-muted-foreground">Review your choices on the left, then publish.</div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-background/80 backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground">{step < 4 ? 'Press Enter to continue' : 'Press Enter to publish'}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 px-3" onClick={gotoBack} disabled={step === 1}>Back</Button>
                      {step < 4 ? (
                        <Button onClick={gotoNext} disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)} className="gap-2 h-8 px-4" size="sm">Next</Button>
                      ) : (
                        <Button onClick={gotoPublish} disabled={!selectedViz || !selectedBreakdown || !selectedMetric} className="gap-2 h-8 px-4" size="sm">
                          <Plus className="h-4 w-4" /> Publish
                        </Button>
                      )}
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