"use client";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface GlobalFiltersProps {
  className?: string;
}

type Candidate = { id: string; name: string | null; invited: boolean }

const ALL_REPS = '__ALL_REPS__'
const ALL_SETTERS = '__ALL_SETTERS__'

export function GlobalFilters({ className }: GlobalFiltersProps) {
  const { 
    filters, 
    setFilters, 
    clearFilters,
  } = useDashboardStore();
  const [repOptions, setRepOptions] = useState<MultiSelectOption[]>([])
  const [setterOptions, setSetterOptions] = useState<MultiSelectOption[]>([])
  const { selectedAccountId } = useAuth()

  // UI state to represent "All" selection without polluting store filters
  const [repAll, setRepAll] = useState<boolean>(!Array.isArray(filters.repIds) || (filters.repIds?.length ?? 0) === 0)
  const [setterAll, setSetterAll] = useState<boolean>(!Array.isArray(filters.setterIds) || (filters.setterIds?.length ?? 0) === 0)

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
        // Build options with explicit "All" at the top
        setRepOptions([
          { value: ALL_REPS, label: 'All Reps (default)', group: 'Quick Select' },
          ...(json.reps || []).map((c: Candidate) => toOption(c, c.invited ? 'Reps' : 'Reps • Uninvited')),
        ])
        setSetterOptions([
          { value: ALL_SETTERS, label: 'All Setters (default)', group: 'Quick Select' },
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
            setRepAll(cleanRepIds.length === 0)
          }
        }

        if (filters.setterIds) {
          const cleanSetterIds = filters.setterIds.filter(id => 
            isValidUUID(id) && validSetterIds.includes(id)
          )
          if (cleanSetterIds.length !== filters.setterIds.length) {
            console.log('🧹 Cleaned invalid setter IDs from filters')
            setFilters({ setterIds: cleanSetterIds.length > 0 ? cleanSetterIds : undefined })
            setSetterAll(cleanSetterIds.length === 0)
          }
        }
      } catch (e) {
        console.warn('Failed to load candidates', e)
      }
    }

    loadCandidates()
  }, [selectedAccountId])
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const handleRepChange = (newSelected: string[]) => {
    // If All + others are selected, drop All and keep the specific selections
    if (newSelected.includes(ALL_REPS) && newSelected.length > 1) {
      const withoutAll = newSelected.filter(v => v !== ALL_REPS)
      setRepAll(false)
      setFilters({ repIds: withoutAll })
      return
    }
    // Only All or empty => treat as All (clear repIds)
    if (newSelected.length === 0 || (newSelected.length === 1 && newSelected[0] === ALL_REPS)) {
      setRepAll(true)
      setFilters({ repIds: undefined })
      return
    }
    // Only specifics
    setRepAll(false)
    setFilters({ repIds: newSelected })
  };
  
  const handleSetterChange = (newSelected: string[]) => {
    if (newSelected.includes(ALL_SETTERS) && newSelected.length > 1) {
      const withoutAll = newSelected.filter(v => v !== ALL_SETTERS)
      setSetterAll(false)
      setFilters({ setterIds: withoutAll })
      return
    }
    if (newSelected.length === 0 || (newSelected.length === 1 && newSelected[0] === ALL_SETTERS)) {
      setSetterAll(true)
      setFilters({ setterIds: undefined })
      return
    }
    setSetterAll(false)
    setFilters({ setterIds: newSelected })
  };
  
  const activeFilterCount = useMemo(() => (
    Object.values(filters).filter(v => 
      v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
    ).length
  ), [filters])

  // Compute UI-selected arrays, defaulting to All when no explicit ids are set
  const uiRepSelected = repAll ? [ALL_REPS] : (filters.repIds || [])
  const uiSetterSelected = setterAll ? [ALL_SETTERS] : (filters.setterIds || [])

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
          selected={uiRepSelected}
          onChange={handleRepChange}
          placeholder="All reps"
          className="w-[220px]"
        />
        
        {/* Setter Selector */}
        <MultiSelect
          options={setterOptions}
          selected={uiSetterSelected}
          onChange={handleSetterChange}
          placeholder="All setters"
          className="w-[220px]"
        />
        
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
              onClick={() => { clearFilters(); setRepAll(true); setSetterAll(true); }}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 