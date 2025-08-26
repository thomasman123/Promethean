"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { X, Filter } from "lucide-react";
import { useDetailedDataStore } from "@/lib/dashboard/detailed-data-store";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function FilterDrawer() {
  const { selectedAccountId } = useAuth();
  const {
    isFilterDrawerOpen,
    toggleFilterDrawer,
    filters,
    setFilters,
    clearFilters,
    recordType,
  } = useDetailedDataStore();

  const [filterOptions, setFilterOptions] = useState<Record<string, MultiSelectOption[]>>({
    status: [],
    stage: [],
    outcome: [],
    tags: [],
    offer: [],
    pipeline: [],
    source: [],
  });

  // Load filter options based on record type
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!selectedAccountId) return;

      try {
        // Load status options
        if (recordType === "appointments") {
          const { data: statuses } = await supabase
            .from("appointments")
            .select("status")
            .eq("account_id", selectedAccountId)
            .limit(100);
          
          const uniqueStatuses = [...new Set(statuses?.map(s => s.status).filter(Boolean) || [])];
          setFilterOptions(prev => ({
            ...prev,
            status: uniqueStatuses.map(s => ({ value: s, label: s })),
          }));
        }

        // Load source options
        const { data: sources } = await supabase
          .from("contact_sources")
          .select("ghl_source")
          .eq("account_id", selectedAccountId)
          .limit(100);
        
        const uniqueSources = [...new Set(sources?.map(s => s.ghl_source).filter(Boolean) || [])];
        setFilterOptions(prev => ({
          ...prev,
          source: uniqueSources.map(s => ({ value: s, label: s })),
        }));

        // TODO: Load other filter options based on record type
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    };

    loadFilterOptions();
  }, [selectedAccountId, recordType]);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleMultiSelectChange = (key: keyof typeof filters) => (values: string[]) => {
    setFilters({ [key]: values.length > 0 ? values : undefined });
  };

  return (
    <Sheet open={isFilterDrawerOpen} onOpenChange={toggleFilterDrawer}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Apply additional filters to refine your data view
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Record-specific filters */}
          {recordType === "appointments" && (
            <>
              <div className="space-y-2">
                <Label>Status</Label>
                <MultiSelect
                  options={filterOptions.status}
                  selected={filters.status || []}
                  onChange={handleMultiSelectChange("status")}
                  placeholder="Select status..."
                />
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <MultiSelect
                  options={filterOptions.outcome}
                  selected={filters.outcome || []}
                  onChange={handleMultiSelectChange("outcome")}
                  placeholder="Select outcome..."
                />
              </div>
            </>
          )}

          {recordType === "deals" && (
            <>
              <div className="space-y-2">
                <Label>Stage</Label>
                <MultiSelect
                  options={filterOptions.stage}
                  selected={filters.stage || []}
                  onChange={handleMultiSelectChange("stage")}
                  placeholder="Select stage..."
                />
              </div>

              <div className="space-y-2">
                <Label>Pipeline</Label>
                <MultiSelect
                  options={filterOptions.pipeline}
                  selected={filters.pipeline || []}
                  onChange={handleMultiSelectChange("pipeline")}
                  placeholder="Select pipeline..."
                />
              </div>
            </>
          )}

          {/* Common filters */}
          <div className="space-y-2">
            <Label>Source/Channel</Label>
            <MultiSelect
              options={filterOptions.source}
              selected={filters.source || []}
              onChange={handleMultiSelectChange("source")}
              placeholder="Select source..."
            />
          </div>

          <div className="space-y-2">
            <Label>Offer/Product</Label>
            <MultiSelect
              options={filterOptions.offer}
              selected={filters.offer || []}
              onChange={handleMultiSelectChange("offer")}
              placeholder="Select offer..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <MultiSelect
              options={filterOptions.tags}
              selected={filters.tags || []}
              onChange={handleMultiSelectChange("tags")}
              placeholder="Select tags..."
            />
          </div>

          <Separator />

          {/* Data hygiene filters */}
          <div className="space-y-4">
            <h4 className="font-medium">Data Hygiene</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-unmapped" className="flex-1">
                Show unmapped records
                <p className="text-xs text-muted-foreground font-normal">
                  Include records without proper source mapping
                </p>
              </Label>
              <Switch
                id="show-unmapped"
                checked={filters.showUnmapped || false}
                onCheckedChange={(checked) => setFilters({ showUnmapped: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-missing-owner" className="flex-1">
                Show records with missing owner
                <p className="text-xs text-muted-foreground font-normal">
                  Include records without assigned setter/closer
                </p>
              </Label>
              <Switch
                id="show-missing-owner"
                checked={filters.showMissingOwner || false}
                onCheckedChange={(checked) => setFilters({ showMissingOwner: checked })}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={clearFilters}>
            Clear All
          </Button>
          <Button onClick={toggleFilterDrawer}>Apply Filters</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
} 