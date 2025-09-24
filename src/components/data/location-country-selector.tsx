"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import locationStore from "@/components/data/location-store"

interface Props {
  className?: string
}

export function LocationCountrySelector({ className }: Props) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[] | null>(locationStore.selected)
  const [countries, setCountries] = useState(locationStore.countries)

  useEffect(() => {
    return locationStore.subscribe(() => {
      setSelected(locationStore.selected)
      setCountries(locationStore.countries)
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
    if (allSelected) {
      locationStore.setSelected([iso])
      return
    }
    const set = new Set(selected ?? [])
    if (set.has(iso)) set.delete(iso)
    else set.add(iso)
    locationStore.setSelected(set.size === 0 ? null : Array.from(set))
  }

  const toggleAll = (checked: boolean) => {
    if (checked) locationStore.setSelected(null)
    else locationStore.setSelected([])
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