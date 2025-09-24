"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function getStore(): {
  selected: string[] | null
  countries: { iso3: string; name: string }[]
  listeners: Set<() => void>
  setSelected: (next: string[] | null) => void
  setCountries: (list: { iso3: string; name: string }[]) => void
  subscribe: (fn: () => void) => () => void
} | null {
  if (typeof window === "undefined") return null
  return (window as any).__locationStore || null
}

interface Props {
  className?: string
}

export function LocationCountrySelector({ className }: Props) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[] | null>(null)
  const [countries, setCountries] = useState<{ iso3: string; name: string }[]>([])

  useEffect(() => {
    const store = getStore()
    if (!store) return
    setSelected(store.selected ?? null)
    setCountries(store.countries ?? [])
    return store.subscribe(() => {
      setSelected(store.selected ?? null)
      setCountries(store.countries ?? [])
    })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return countries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || c.iso3.toLowerCase().includes(q) : true))
  }, [countries, query])

  const allSelected = selected === null

  const toggleIso = (iso: string) => {
    const store = getStore()
    if (!store) return
    if (allSelected) {
      // if "all", selecting one turns it into just that one
      store.setSelected([iso])
      return
    }
    const set = new Set(selected ?? [])
    if (set.has(iso)) set.delete(iso)
    else set.add(iso)
    store.setSelected(set.size === 0 ? null : Array.from(set))
  }

  const toggleAll = (checked: boolean) => {
    const store = getStore()
    if (!store) return
    if (checked) store.setSelected(null)
    else store.setSelected([]) // deselect all -> empty set
  }

  return (
    <div className={cn("flex flex-col border rounded-md p-3", className)}>
      <div className="mb-2">
        <Input
          placeholder="Search countries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Checkbox id="all-countries" checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
        <Label htmlFor="all-countries" className="text-sm">Select all</Label>
      </div>
      <ScrollArea className="flex-1 rounded-md border bg-background/50">
        <div className="p-2 space-y-1">
          {filtered.map((c) => {
            const isChecked = allSelected || (selected ?? []).includes(c.iso3)
            return (
              <label key={c.iso3} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer">
                <Checkbox checked={!!isChecked} onCheckedChange={() => toggleIso(c.iso3)} />
                <span className="text-sm">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.iso3}</span>
              </label>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-4">No countries found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 