"use client";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter, ToggleLeft, ToggleRight } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { DateRange } from "react-day-picker";
import { CompareModeControls } from "./compare-mode-controls";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface GlobalFiltersProps {
  className?: string;
}

type Candidate = { id: string; name: string | null; invited: boolean }

export function GlobalFilters({ className }: GlobalFiltersProps) {
  const { 
    filters, 
    setFilters, 
    clearFilters,
    compareMode,
    toggleCompareMode,
  } = useDashboardStore();
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [repOptions, setRepOptions] = useState<MultiSelectOption[]>([])
  const [setterOptions, setSetterOptions] = useState<MultiSelectOption[]>([])
  const { selectedAccountId } = useAuth()

  useEffect(() => {
    const loadCandidates = async () => {
      if (!selectedAccountId) return
      try {
        const res = await fetch(`/api/team/candidates?accountId=${encodeURIComponent(selectedAccountId)}`)
        const json = await res.json()
        const toOption = (c: Candidate, groupLabel: string): MultiSelectOption => ({
          value: c.id,
          label: `${c.name || 'Unknown'}${c.invited ? '' : ' (uninvited)'}`,
          group: groupLabel,
        })
        setRepOptions([
          ...(json.reps || []).map((c: Candidate) => toOption(c, c.invited ? 'Reps' : 'Reps • Uninvited')),
        ])
        setSetterOptions([
          ...(json.setters || []).map((c: Candidate) => toOption(c, c.invited ? 'Setters' : 'Setters • Uninvited')),
        ])

        // Clean up any invalid IDs (non-UUIDs) from current filters
        const isValidUUID = (str: string): boolean => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          return uuidRegex.test(str)
        }

        const validRepIds = json.reps?.map((r: Candidate) => r.id) || []
        const validSetterIds = json.setters?.map((s: Candidate) => s.id) || []

        // Filter out any invalid IDs from current filters
        if (filters.repIds) {
          const cleanRepIds = filters.repIds.filter(id => 
            isValidUUID(id) && validRepIds.includes(id)
          )
          if (cleanRepIds.length !== filters.repIds.length) {
            console.log('🧹 Cleaned invalid rep IDs from filters')
            setFilters({ repIds: cleanRepIds.length > 0 ? cleanRepIds : undefined })
          }
        }

        if (filters.setterIds) {
          const cleanSetterIds = filters.setterIds.filter(id => 
            isValidUUID(id) && validSetterIds.includes(id)
          )
          if (cleanSetterIds.length !== filters.setterIds.length) {
            console.log('🧹 Cleaned invalid setter IDs from filters')
            setFilters({ setterIds: cleanSetterIds.length > 0 ? cleanSetterIds : undefined })
          }
        }
      } catch (e) {
        console.warn('Failed to load candidates', e)
      }
    }
    loadCandidates()
  }, [selectedAccountId, filters.repIds, filters.setterIds, setFilters])
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const handleRepChange = (repIds: string[]) => {
    setFilters({ repIds });
  };
  
  const handleSetterChange = (setterIds: string[]) => {
    setFilters({ setterIds });
  };
  
  const activeFilterCount = useMemo(() => (
    Object.values(filters).filter(v => 
      v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
    ).length
  ), [filters])

  const openCompareModal = () => {
    if (!compareMode) {
      toggleCompareMode();
    }
    setIsCompareModalOpen(true);
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4 border-b", className)}>
      {/* Main Filter Bar */}
      <div className="flex items-center gap-4">
        {/* Date Range Picker */}
        <DateRangePicker
          date={{
            from: filters.startDate,
            to: filters.endDate
          }}
          onDateChange={handleDateChange}
        />
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Rep Selector */}
        <MultiSelect
          options={repOptions}
          selected={filters.repIds || []}
          onChange={handleRepChange}
          placeholder="Select reps"
          className="w-[220px]"
        />
        
        {/* Setter Selector */}
        <MultiSelect
          options={setterOptions}
          selected={filters.setterIds || []}
          onChange={handleSetterChange}
          placeholder="Select setters"
          className="w-[220px]"
        />
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Compare Mode Button opens modal */}
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={openCompareModal}
          className="gap-2"
        >
          {compareMode ? (
            <>
              <ToggleRight className="h-4 w-4" />
              Compare Settings
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4" />
              Open Compare
            </>
          )}
        </Button>
        
        <div className="flex-1" />
        
        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">
              {activeFilterCount} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </div>
      
      {/* Compare Mode Modal */}
      <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Mode</DialogTitle>
          </DialogHeader>
          <CompareModeControls 
            reps={repOptions}
            setters={setterOptions}
            className="mt-2"
          />
          <div className="flex justify-end gap-2 pt-2">
            {compareMode && (
              <Button variant="ghost" onClick={() => { toggleCompareMode(); setIsCompareModalOpen(false); }}>
                Disable compare
              </Button>
            )}
            <Button onClick={() => setIsCompareModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 