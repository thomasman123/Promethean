"use client"

import * as React from "react"
import { Sidebar } from "@/components/navigation/sidebar"
import { TopBar } from "@/components/navigation/top-bar"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  showDateFilter?: boolean
}

export function DashboardLayout({ 
  children, 
  title,
  showDateFilter = true 
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="pl-48">
        {/* Top bar */}
        <TopBar title={title} showDateFilter={showDateFilter} />
        
        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 