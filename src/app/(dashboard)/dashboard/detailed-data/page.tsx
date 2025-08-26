"use client";

import { useEffect, useState } from "react";
import { GlobalFilters } from "@/components/dashboard/global-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Table, 
  LayoutGrid,
  Database,
  Filter,
  Download,
  Share2,
  Settings,
  Plus,
  CalendarDays,
  CalendarRange,
  CalendarIcon,
  Users,
  User,
  Building,
  Tag
} from "lucide-react";
import { useDetailedDataStore, type ViewMode, type GroupBy, type RecordType } from "@/lib/dashboard/detailed-data-store";
import { useDashboardStore } from "@/lib/dashboard/store";
import { useAuth } from "@/hooks/useAuth";
import { DetailedDataTable } from "@/components/dashboard/detailed-data/detailed-data-table";
import { DetailedDataWidgets } from "@/components/dashboard/detailed-data/detailed-data-widgets";
import { FilterDrawer } from "@/components/dashboard/detailed-data/filter-drawer";
import { ViewsManager } from "@/components/dashboard/detailed-data/views-manager";
import { DrilldownModal } from "@/components/dashboard/detailed-data/drilldown-modal";
import { ColumnManager } from "@/components/dashboard/detailed-data/column-manager";
import { cn } from "@/lib/utils";

const recordTypeLabels: Record<RecordType, string> = {
  appointments: "Appointments",
  dials: "Dials/Calls", 
  deals: "Deals/Opportunities",
  payments: "Payments/Cash",
  leads: "Leads/Contacts"
};

const groupByIcons: Record<GroupBy, React.ElementType> = {
  date: CalendarDays,
  week: CalendarRange,
  month: CalendarIcon,
  setter: User,
  closer: User,
  team: Users,
  offer: Tag
};

export default function DetailedDataPage() {
  const { selectedAccountId } = useAuth();
  const { filters: globalFilters } = useDashboardStore();
  const {
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    recordType,
    setRecordType,
    dateBasis,
    filters,
    setFilters,
    sortBy,
    isFilterDrawerOpen,
    toggleFilterDrawer,
    isDrilldownOpen,
    compareMode,
    toggleCompareMode,
  } = useDetailedDataStore();

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync global filters with detailed data filters
  useEffect(() => {
    setFilters({
      dateRange: globalFilters.startDate && globalFilters.endDate 
        ? { from: globalFilters.startDate, to: globalFilters.endDate }
        : undefined,
      repIds: globalFilters.repIds,
      setterIds: globalFilters.setterIds,
      source: globalFilters.source_category,
    });
  }, [globalFilters, setFilters]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/detailed-data/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          viewMode,
          recordType,
          groupBy,
          filters,
          sortBy,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${recordType}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleShare = () => {
    const params = new URLSearchParams({
      viewMode,
      recordType,
      groupBy,
      filters: JSON.stringify(filters),
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    // You could also show a toast notification here
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Controls under breadcrumb header */}
      <div className="sticky top-16 z-40 bg-background border-b shadow-sm">
        <div className="px-4 py-3 space-y-3">
          {/* First row: Global filters and view controls */}
          <div className="flex items-center gap-3">
            <GlobalFilters className="p-0 border-0 flex-1" />
            
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value: string | undefined) => value && setViewMode(value as ViewMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="aggregated" aria-label="Aggregated view">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Aggregated
              </ToggleGroupItem>
              <ToggleGroupItem value="unaggregated" aria-label="Raw data view">
                <Database className="h-4 w-4 mr-2" />
                Raw Data
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="ml-auto flex items-center gap-2">
              <ViewsManager />
              <Button variant="outline" size="icon" onClick={toggleFilterDrawer}>
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsColumnManagerOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Second row: Record type selector and grouping controls */}
          <div className="flex items-center gap-3">
            {/* Record Type Selector */}
            <Select value={recordType} onValueChange={(value) => setRecordType(value as RecordType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(recordTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Basis Indicator */}
            <Badge variant="secondary" className="text-xs">
              Date basis: {dateBasis.replace('_', ' ')}
            </Badge>

            {viewMode === 'aggregated' && (
              <>
                <div className="h-4 w-px bg-border" />
                
                {/* Group By Controls */}
                <span className="text-sm text-muted-foreground">Group by:</span>
                <ToggleGroup 
                  type="single" 
                  value={groupBy} 
                  onValueChange={(value: string | undefined) => value && setGroupBy(value as GroupBy)}
                  className="gap-1"
                >
                  {Object.entries(groupByIcons).map(([key, Icon]) => (
                    <ToggleGroupItem key={key} value={key} size="sm">
                      <Icon className="h-4 w-4" />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                {/* Compare Mode Toggle */}
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleCompareMode}
                  className="ml-2"
                >
                  Compare
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 space-y-4">
        {/* KPI Widgets */}
        <DetailedDataWidgets />

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {viewMode === 'aggregated' 
                    ? `${recordTypeLabels[recordType]} by ${groupBy}`
                    : `${recordTypeLabels[recordType]} - Raw Data`
                  }
                </CardTitle>
                <CardDescription>
                  {viewMode === 'aggregated'
                    ? "Summarized metrics grouped by your selected dimension"
                    : "Individual record-level data with full details"
                  }
                </CardDescription>
              </div>
              {isLoading && (
                <Badge variant="secondary" className="animate-pulse">
                  Loading...
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DetailedDataTable />
          </CardContent>
        </Card>
      </div>

      {/* Modals and Drawers */}
      <FilterDrawer />
      <DrilldownModal />
      <ColumnManager 
        open={isColumnManagerOpen} 
        onOpenChange={setIsColumnManagerOpen} 
      />
    </div>
  );
} 