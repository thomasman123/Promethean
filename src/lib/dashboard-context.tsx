"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { usePersistedAccount } from '@/hooks/use-persisted-account'

interface DashboardContextType {
  dateRange: {
    from: Date
    to: Date
  }
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void
  currentViewId: string
  setCurrentViewId: (viewId: string) => void
  selectedAccountId: string
  setSelectedAccountId: (accountId: string) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [dateRange, setDateRangeState] = useState({
    from: startOfMonth(today),
    to: today,
  })
  const [currentViewId, setCurrentViewId] = useState<string>("")
  const { selectedAccountId, setSelectedAccountId } = usePersistedAccount()

  const setDateRange = (range: { from: Date | undefined; to: Date | undefined }) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    setDateRangeState({
      from: range.from || startOfMonth(now),
      to: (range.to && range.to <= now) ? range.to : now,
    })
  }

  return (
    <DashboardContext.Provider value={{
      dateRange,
      setDateRange,
      currentViewId,
      setCurrentViewId,
      selectedAccountId,
      setSelectedAccountId,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
} 