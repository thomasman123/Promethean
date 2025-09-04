"use client"

import { TopBar } from "@/components/layout/topbar"
import { useDashboard } from "@/lib/dashboard-context"

export default function DashboardPage() {
  const { selectedAccountId, currentViewId } = useDashboard()

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16">
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