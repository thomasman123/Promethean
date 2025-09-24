"use client"

import { useEffect, useState } from "react"
import { GithubGlobe } from "@/components/data/github-globe"
import locationStore from "@/components/data/location-store"

export function ConnectedGithubGlobe() {
  const [selected, setSelected] = useState<string[] | null>(locationStore.selected)

  useEffect(() => {
    const unsub = locationStore.subscribe(() => setSelected(locationStore.selected))
    return () => unsub()
  }, [])

  return (
    <GithubGlobe
      className="h-full w-full"
      selectedISOs={selected}
      onSelectionChange={(s) => locationStore.setSelected(s)}
      onCountriesLoaded={(c) => locationStore.setCountries(c)}
    />
  )
} 