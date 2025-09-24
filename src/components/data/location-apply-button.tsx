"use client"

import { Button } from "@/components/ui/button"
import locationStore from "@/components/data/location-store"
import { useEffect, useState } from "react"

export function ApplyLocationButton() {
  const [selected, setSelected] = useState<string[] | null>(locationStore.selected)
  useEffect(() => {
    return locationStore.subscribe(() => setSelected(locationStore.selected))
  }, [])

  const isEmpty = Array.isArray(selected) && selected.length === 0

  const handleApply = () => {
    // TODO: Hook this into wherever the selection should be saved
    // For now just close the dialog
    const closeBtn = document.querySelector(
      '[data-state="open"][role="dialog"] button[aria-label="Close"]'
    ) as HTMLButtonElement | null
    closeBtn?.click()
  }

  return (
    <Button size="sm" disabled={isEmpty} onClick={handleApply}>
      Apply
    </Button>
  )
} 