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

type KeyedOptions = Record<string, MultiSelectOption[]>

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

  // Advanced filter options (loaded lazily from data)
  const [advOptions, setAdvOptions] = useState<KeyedOptions>({})

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
      } catch (e) {
        console.warn('Failed to load candidates', e)
      }
    }

    const loadAdvancedOptions = async () => {
      if (!selectedAccountId) return
      try {
        const r = await fetch(`/api/metrics/options?accountId=${encodeURIComponent(selectedAccountId)}`)
        const data = await r.json()
        const toOpt = (v: string): MultiSelectOption => ({ value: v, label: v })
        const keyToOptions: KeyedOptions = {}
        ;['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','source_category','specific_source','session_source','referrer'].forEach((k) => {
          const arr = (data?.[k] || []) as string[]
          keyToOptions[k] = arr.map(toOpt)
        })
        setAdvOptions(keyToOptions)
      } catch (e) {
        console.warn('Failed to load advanced options', e)
      }
    }

    loadCandidates()
    loadAdvancedOptions()
  }, [selectedAccountId])
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const handleRepChange = (newSelected: string[]) => {
    if (newSelected.includes(ALL_REPS)) {
      setRepAll(true)
      setFilters({ repIds: undefined })
      return
    }
    if (newSelected.length === 0) {
      setRepAll(true)
      setFilters({ repIds: undefined })
      return
    }
    setRepAll(false)
    setFilters({ repIds: newSelected })
  };
  
  const handleSetterChange = (newSelected: string[]) => {
    if (newSelected.includes(ALL_SETTERS)) {
      setSetterAll(true)
      setFilters({ setterIds: undefined })
      return
    }
    if (newSelected.length === 0) {
      setSetterAll(true)
      setFilters({ setterIds: undefined })
      return
    }
    setSetterAll(false)
    setFilters({ setterIds: newSelected })
  };

  // Advanced handlers (array-or-undefined semantics; empty => undefined)
  const onAdvChange = (key: keyof typeof filters) => (vals: string[]) => {
    setFilters({ [key]: vals.length > 0 ? vals : undefined } as any)
  }
  
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
      <div className="flex flex-wrap items-center gap-4">
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

        {/* UTM/Attribution filters */}
        <Separator orientation="vertical" className="h-6" />
        <MultiSelect
          options={advOptions.utm_source || []}
          selected={(filters as any).utm_source || []}
          onChange={onAdvChange('utm_source' as any)}
          placeholder="All UTM Sources"
          className="w-[220px]"
        />
        <MultiSelect
          options={advOptions.utm_medium || []}
          selected={(filters as any).utm_medium || []}
          onChange={onAdvChange('utm_medium' as any)}
          placeholder="All UTM Mediums"
          className="w-[220px]"
        />
        <MultiSelect
          options={advOptions.utm_campaign || []}
          selected={(filters as any).utm_campaign || []}
          onChange={onAdvChange('utm_campaign' as any)}
          placeholder="All Campaigns"
          className="w-[220px]"
        />
        <MultiSelect
          options={advOptions.source_category || []}
          selected={(filters as any).source_category || []}
          onChange={onAdvChange('source_category' as any)}
          placeholder="All Categories"
          className="w-[220px]"
        />
        <MultiSelect
          options={advOptions.specific_source || []}
          selected={(filters as any).specific_source || []}
          onChange={onAdvChange('specific_source' as any)}
          placeholder="All Sources"
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