"use client"

import { useEffect, useState } from "react"
import { GithubGlobe } from "@/components/data/github-globe"

// Simple shared state via window for modal-local sync
function getStore(): {
  selected: string[] | null
  countries: { iso3: string; name: string }[]
  listeners: Set<() => void>
  setSelected: (next: string[] | null) => void
  setCountries: (list: { iso3: string; name: string }[]) => void
  subscribe: (fn: () => void) => () => void
} | null {
  if (typeof window === "undefined") return null
  ;(window as any).__locationStore = (window as any).__locationStore || {
    selected: null as string[] | null,
    listeners: new Set<() => void>(),
    setSelected(next: string[] | null) {
      this.selected = next
      this.listeners.forEach((fn: () => void) => fn())
    },
    setCountries(list: { iso3: string; name: string }[]) {
      this.countries = list
      this.listeners.forEach((fn: () => void) => fn())
    },
    countries: [] as { iso3: string; name: string }[],
    subscribe(fn: () => void) {
      this.listeners.add(fn)
      return () => this.listeners.delete(fn)
    },
  }
  return (window as any).__locationStore as ReturnType<typeof getStore>
}

export function ConnectedGithubGlobe() {
  const [selected, setSelected] = useState<string[] | null>(null)

  useEffect(() => {
    const store = getStore()
    if (!store) return
    setSelected(store.selected ?? null)
    return store.subscribe(() => setSelected(store.selected ?? null))
  }, [])

  return (
    <GithubGlobe
      className="h-full w-full"
      selectedISOs={selected}
      onSelectionChange={(s) => {
        const store = getStore()
        store?.setSelected(s)
      }}
      onCountriesLoaded={(c) => {
        const store = getStore()
        store?.setCountries(c)
      }}
    />
  )
} 