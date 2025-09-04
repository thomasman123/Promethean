"use client"

import { TopBar } from "@/components/layout/topbar"
import { DatePicker } from "@/components/ui/date-picker"
import { ViewsManager } from "@/components/dashboard/views-manager"
import { useState, useEffect } from "react"
import { startOfMonth, endOfMonth } from "date-fns"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentViewId, setCurrentViewId] = useState<string>("")

  useEffect(() => {
    // Get account ID from localStorage or listen for changes
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

  useEffect(() => {
    // Get current user ID
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.user?.id || "")
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
  }

  const handleDateChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange({
      from: range.from || startOfMonth(new Date()),
      to: range.to || endOfMonth(new Date()),
    })
  }

  const handleViewChange = (viewId: string) => {
    setCurrentViewId(viewId)
    // Here you would load the view configuration and update the dashboard
    console.log('View changed to:', viewId)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16">
        {/* Secondary navigation bar */}
        <div className="sticky top-16 z-40 bg-background border-b">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Left side - empty for now */}
            <div className="flex-1" />
            
            {/* Right side - Date picker and Views */}
            <div className="flex items-center gap-3">
              <DatePicker
                value={dateRange}
                onChange={handleDateChange}
              />
              
              <ViewsManager
                accountId={selectedAccountId}
                currentUserId={currentUserId}
                onViewChange={handleViewChange}
              />
            </div>
          </div>
        </div>
        
        {/* Dashboard content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            
            {/* Dashboard widgets will go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder cards */}
              <div className="h-48 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
                <span className="text-muted-foreground">Widget 1</span>
              </div>
              <div className="h-48 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
                <span className="text-muted-foreground">Widget 2</span>
              </div>
              <div className="h-48 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
                <span className="text-muted-foreground">Widget 3</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 