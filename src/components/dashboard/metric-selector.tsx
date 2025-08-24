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
  ArrowRight,
  ArrowLeft,
  ChevronRight,
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
  kpi: { label: "KPI Tile", icon: <Zap className="h-5 w-5" />, description: "Single value display" },
  line: { label: "Line Chart", icon: <LineChart className="h-5 w-5" />, description: "Trends over time" },
  bar: { label: "Bar Chart", icon: <BarChart3 className="h-5 w-5" />, description: "Compare values" },
  area: { label: "Area Chart", icon: <Activity className="h-5 w-5" />, description: "Filled line chart" },
  radar: { label: "Radar Chart", icon: <PieChart className="h-5 w-5" />, description: "Multi-dimensional" },
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

  const steps = [
    { number: 1, title: "Visualization", description: "Choose chart type" },
    { number: 2, title: "Metrics", description: "Select data" },
    { number: 3, title: "Settings", description: "Configure options" },
    { number: 4, title: "Review", description: "Confirm & publish" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
        {/* Header with modern stepper */}
        <div className="px-8 py-6 border-b bg-gradient-to-r from-background via-muted/20 to-background">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">Create Widget</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Follow the steps below to add a new metric widget to your dashboard.
            </DialogDescription>
          </DialogHeader>
          
          {/* Modern Stepper */}
          <div className="flex items-center justify-center space-x-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center">
                <div 
                  className={cn(
                    "flex flex-col items-center cursor-pointer group",
                    step >= s.number ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => setStep(s.number as 1|2|3|4)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all",
                    step > s.number ? "bg-primary border-primary text-primary-foreground" :
                    step === s.number ? "border-primary bg-primary/10 text-primary" :
                    "border-muted-foreground/30 group-hover:border-primary/50"
                  )}>
                    {step > s.number ? <Check className="h-5 w-5" /> : s.number}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-8">
            {/* Step 1: Visualization Selection */}
            {step === 1 && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2">Choose Your Visualization</h3>
                  <p className="text-muted-foreground">Select how you want to display your data</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(vizTypeConfig) as [VizType, typeof vizTypeConfig[VizType]][]).map(([viz, config]) => (
                    <Card 
                      key={viz} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg border-2",
                        selectedViz === viz ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleVizChange(viz)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "p-3 rounded-lg",
                            selectedViz === viz ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {config.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{config.label}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {viz === 'kpi' ? 'Single metric' : 'Up to 3 metrics'}
                              </Badge>
                            </div>
                          </div>
                          {selectedViz === viz && (
                            <Check className="h-6 w-6 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Metric Selection */}
            {step === 2 && (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Select Your Metrics</h3>
                  <p className="text-muted-foreground">
                    {selectedViz === 'kpi' ? 'Choose one metric to display' : 'Choose up to 3 metrics to compare'}
                  </p>
                </div>

                {/* Selected Metrics Bar */}
                {selectedMetrics.length > 0 && (
                  <Card className="mb-6 bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Selected:</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedMetrics.map((metric) => (
                              <Badge key={metric.name} variant="default" className="flex items-center gap-1.5">
                                {metric.displayName}
                                {selectedViz !== 'kpi' && (
                                  <X 
                                    className="h-3 w-3 cursor-pointer hover:bg-primary-foreground/20 rounded-full p-0.5" 
                                    onClick={() => toggleMultiMetric(metric)}
                                  />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {selectedMetrics.length}/{selectedViz === 'kpi' ? 1 : 3}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Search and Filter */}
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search metrics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
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
                      className="gap-1.5"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Favorites
                    </Button>
                    <Button 
                      size="sm" 
                      variant={filterMode === "recent" ? "default" : "outline"} 
                      onClick={() => setFilterMode("recent")}
                    >
                      Recent
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-6">
                    {Object.entries(filteredGroupedMetrics).map(([category, metrics]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          {categoryIcons[category]}
                          <h4 className="font-medium text-sm">{category}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {metrics.map((metric) => {
                            const isSelected = selectedMetrics.some((m) => m.name === metric.name);
                            const isFav = favoriteMetricNames.includes(metric.name);
                            const canSelect = selectedViz === 'kpi' ? !isSelected && selectedMetrics.length === 0 : selectedMetrics.length < 3;
                            
                            return (
                              <Card 
                                key={metric.name}
                                className={cn(
                                  "cursor-pointer transition-all border-2",
                                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                                  !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                  if (canSelect || isSelected) {
                                    if (selectedViz === 'kpi') {
                                      handleMetricSelect(metric);
                                    } else {
                                      toggleMultiMetric(metric);
                                    }
                                  }
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {selectedViz !== 'kpi' && (
                                          <Checkbox 
                                            checked={isSelected} 
                                            disabled={!canSelect && !isSelected}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        )}
                                        <h5 className="font-medium text-sm">{metric.displayName}</h5>
                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {metric.description}
                                      </p>
                                      <div className="flex gap-1">
                                        {metric.supportedBreakdowns.map((breakdown) => (
                                          <Badge key={breakdown} variant="outline" className="text-[10px] px-1 py-0">
                                            {breakdown}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <Button
                                      variant={isFav ? "default" : "ghost"}
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(metric.name);
                                      }}
                                    >
                                      <Star className={cn("h-3 w-3", isFav && "fill-current")} />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2">Configure Settings</h3>
                  <p className="text-muted-foreground">Customize your widget appearance and behavior</p>
                </div>
                <div className="space-y-6">
                  {/* Widget Title */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Widget Title</CardTitle>
                      <CardDescription>Choose a custom title for your widget</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input 
                        value={customTitle} 
                        onChange={(e) => setCustomTitle(e.target.value)} 
                        placeholder={selectedMetric?.displayName || 'Enter widget title'}
                        className="text-base"
                      />
                    </CardContent>
                  </Card>

                  {/* Cumulative Toggle */}
                  {isCumulativeEligible && (
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">Cumulative Mode</div>
                            <div className="text-sm text-muted-foreground">
                              Show running total that compounds over time periods
                            </div>
                          </div>
                          <Switch 
                            checked={isCumulative} 
                            onCheckedChange={setIsCumulative}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2">Review & Publish</h3>
                  <p className="text-muted-foreground">Confirm your widget configuration</p>
                </div>
                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Widget Preview
                      <Badge variant="secondary">{customTitle || selectedMetric?.displayName}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Visualization:</span>
                        <div className="mt-1 flex items-center gap-2">
                          {selectedViz && vizTypeConfig[selectedViz].icon}
                          <span className="font-medium">{selectedViz && vizTypeConfig[selectedViz].label}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Metrics:</span>
                        <div className="mt-1 font-medium">
                          {selectedViz === 'kpi' 
                            ? selectedMetrics[0]?.displayName 
                            : `${selectedMetrics.length} metric${selectedMetrics.length !== 1 ? 's' : ''}`
                          }
                        </div>
                      </div>
                      {isCumulativeEligible && (
                        <div>
                          <span className="font-medium text-muted-foreground">Cumulative:</span>
                          <div className="mt-1 font-medium">{isCumulative ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      )}
                    </div>
                    {selectedViz !== 'kpi' && selectedMetrics.length > 0 && (
                      <div>
                        <span className="font-medium text-muted-foreground text-sm">Selected Metrics:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedMetrics.map((metric) => (
                            <Badge key={metric.name} variant="outline">{metric.displayName}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/10 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Step {step} of {steps.length}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={gotoBack} 
                  disabled={step === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                {step < 4 ? (
                  <Button 
                    onClick={gotoNext} 
                    disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                    className="gap-2"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={gotoPublish} 
                    disabled={!selectedViz || !selectedBreakdown || !selectedMetric}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Widget
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 