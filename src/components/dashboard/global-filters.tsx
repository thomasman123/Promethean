"use client";

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/lib/dashboard/store'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Filter, SlidersHorizontal, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { DateRange } from 'react-day-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface GlobalFiltersProps {
  className?: string
}

type Candidate = { id: string; name: string | null; invited: boolean }

type KeyedOptions = Record<string, MultiSelectOption[]>

type FilterPreset = { id: string; name: string; filters: Partial<Record<string, string[]>> }

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

  // Advanced filter options (loaded on modal open)
  const [advOptions, setAdvOptions] = useState<KeyedOptions>({})
  const [advOpen, setAdvOpen] = useState(false)

  // Presets (local/in-memory until API is added)
  const [presets, setPresets] = useState<FilterPreset[]>([
    { id: 'paid_social', name: 'Paid Social', filters: { source_category: ['facebook_ads','instagram_ads'] } },
    { id: 'paid_search', name: 'Paid Search', filters: { source_category: ['google_ads'] } },
    { id: 'email', name: 'Email', filters: { source_category: ['email_marketing'] } },
    { id: 'direct', name: 'Direct', filters: { source_category: ['organic'] } },
  ])
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(undefined)

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

    loadCandidates()
  }, [selectedAccountId])

  useEffect(() => {
    const loadAdvancedOptions = async () => {
      if (!selectedAccountId || !advOpen) return
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

    loadAdvancedOptions()
  }, [selectedAccountId, advOpen])
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const handleRepChange = (newSelected: string[]) => {
    if (newSelected.includes(ALL_REPS)) {
      // If ONLY the "All" option is present, treat as All
      if (newSelected.length === 1) {
        setRepAll(true)
        setFilters({ repIds: undefined })
        return
      }
      // Otherwise, remove the "All" sentinel and use the remaining selections
      newSelected = newSelected.filter(v => v !== ALL_REPS)
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
      // If ONLY the "All" option is present, treat as All
      if (newSelected.length === 1) {
        setSetterAll(true)
        setFilters({ setterIds: undefined })
        return
      }
      // Otherwise, remove the "All" sentinel and use the remaining selections
      newSelected = newSelected.filter(v => v !== ALL_SETTERS)
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

  const applyPreset = (presetId?: string) => {
    setSelectedPresetId(presetId)
    const p = presets.find(pr => pr.id === presetId)
    if (!p) return
    // Only apply known advanced keys to avoid clobbering other filters
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','source_category','specific_source','session_source','referrer'] as const
    const updates: Record<string, string[] | undefined> = {}
    for (const k of keys) {
      updates[k] = p.filters[k]
    }
    setFilters(updates as any)
  }

  const savePreset = async () => {
    const name = prompt('Preset name?')?.trim()
    if (!name) return
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','source_category','specific_source','session_source','referrer'] as const
    const current: Record<string, string[] | undefined> = {}
    for (const k of keys) current[k] = (filters as any)[k]
    const newPreset: FilterPreset = { id: `${Date.now()}`, name, filters: current }
    setPresets(prev => [newPreset, ...prev])
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
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
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
        {/* Advanced Filters Modal Trigger (disabled) */}
        {/**
         * Advanced Filters temporarily disabled
         * <Dialog open={advOpen} onOpenChange={setAdvOpen}>
         *   <DialogTrigger asChild>
         *     <Button variant="outline" className="gap-2">
         *       <SlidersHorizontal className="h-4 w-4" /> Advanced Filters
         *     </Button>
         *   </DialogTrigger>
         *   <DialogContent className="max-w-3xl">
         *     <DialogHeader>
         *       <div className="flex items-center justify-between gap-2">
         *         <DialogTitle>Advanced Filters</DialogTitle>
         *         <div className="flex items-center gap-2">
         *           <Select value={selectedPresetId} onValueChange={(v) => applyPreset(v)}>
         *             <SelectTrigger size="sm" className="min-w-[180px]">
         *               <SelectValue placeholder="Presets" />
         *             </SelectTrigger>
         *             <SelectContent>
         *               {presets.map(p => (
         *                 <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
         *               ))}
         *             </SelectContent>
         *           </Select>
         *           <Button size="sm" variant="outline" onClick={savePreset}>Save as Preset</Button>
         *         </div>
         *       </div>
         *     </DialogHeader>
         *     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
         *       <MultiSelect
         *         options={advOptions.utm_source || []}
         *         selected={(filters as any).utm_source || []}
         *         onChange={onAdvChange('utm_source' as any)}
         *         placeholder="All UTM Sources"
         *       />
         *       <MultiSelect
         *         options={advOptions.utm_medium || []}
         *         selected={(filters as any).utm_medium || []}
         *         onChange={onAdvChange('utm_medium' as any)}
         *         placeholder="All UTM Mediums"
         *       />
         *       <MultiSelect
         *         options={advOptions.utm_campaign || []}
         *         selected={(filters as any).utm_campaign || []}
         *         onChange={onAdvChange('utm_campaign' as any)}
         *         placeholder="All Campaigns"
         *       />
         *       <MultiSelect
         *         options={advOptions.utm_content || []}
         *         selected={(filters as any).utm_content || []}
         *         onChange={onAdvChange('utm_content' as any)}
         *         placeholder="All UTM Content"
         *       />
         *       <MultiSelect
         *         options={advOptions.utm_term || []}
         *         selected={(filters as any).utm_term || []}
         *         onChange={onAdvChange('utm_term' as any)}
         *         placeholder="All UTM Terms"
         *       />
         *       <MultiSelect
         *         options={advOptions.utm_id || []}
         *         selected={(filters as any).utm_id || []}
         *         onChange={onAdvChange('utm_id' as any)}
         *         placeholder="All UTM IDs"
         *       />
         *       <MultiSelect
         *         options={advOptions.source_category || []}
         *         selected={(filters as any).source_category || []}
         *         onChange={onAdvChange('source_category' as any)}
         *         placeholder="All Categories"
         *       />
         *       <MultiSelect
         *         options={advOptions.specific_source || []}
         *         selected={(filters as any).specific_source || []}
         *         onChange={onAdvChange('specific_source' as any)}
         *         placeholder="All Sources"
         *       />
         *       <MultiSelect
         *         options={advOptions.session_source || []}
         *         selected={(filters as any).session_source || []}
         *         onChange={onAdvChange('session_source' as any)}
         *         placeholder="All Session Sources"
         *       />
         *       <MultiSelect
         *         options={advOptions.referrer || []}
         *         selected={(filters as any).referrer || []}
         *         onChange={onAdvChange('referrer' as any)}
         *         placeholder="All Referrers"
         *       />
         *     </div>
         *   </DialogContent>
         * </Dialog>
         */}
      </div>
    </div>
  );
} 