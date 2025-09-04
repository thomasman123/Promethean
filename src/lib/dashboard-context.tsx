"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'

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
  const [dateRange, setDateRangeState] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [currentViewId, setCurrentViewId] = useState<string>("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  useEffect(() => {
    // Get account ID from localStorage
    const accountId = localStorage.getItem('selectedAccountId')
    if (accountId) {
      setSelectedAccountId(accountId)
    }

    // Listen for account changes
    const handleAccountChange = (e: Event) => {
      const customEvent = e as CustomEvent
      setSelectedAccountId(customEvent.detail.accountId)
    }

    window.addEventListener('accountChanged', handleAccountChange)
    return () => window.removeEventListener('accountChanged', handleAccountChange)
  }, [])

  const setDateRange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRangeState({
      from: range.from || startOfMonth(new Date()),
      to: range.to || endOfMonth(new Date()),
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