"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { ViewsManager } from "@/components/dashboard/views-manager"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/lib/dashboard-context"

interface DashboardControlsProps {
  currentUserId: string
  currentViewId: string | null
  onViewChange: (viewId: string) => void
  onAddWidget: () => void
}

export function DashboardControls({
  currentUserId,
  currentViewId,
  onViewChange,
  onAddWidget,
}: DashboardControlsProps) {
  const { dateRange, setDateRange, selectedAccountId } = useDashboard()

  return (
    <div className="sticky top-0 z-10 mb-6">
      <div className="flex items-center gap-3">
        {/* Date Picker */}
        <DatePicker
          value={dateRange}
          onChange={setDateRange}
          applyMode
        />

        {/* Views Manager */}
        {selectedAccountId ? (
          <ViewsManager
            accountId={selectedAccountId}
            currentUserId={currentUserId}
            currentViewId={currentViewId}
            onViewChange={onViewChange}
          />
        ) : (
          <div className="h-8 px-3 py-1 text-sm text-muted-foreground bg-muted rounded-md flex items-center">
            Loading views...
          </div>
        )}

        {/* Add Widget Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onAddWidget}
          disabled={!selectedAccountId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </div>
    </div>
  )
}

