"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Filter,
  Search,
  Bell,
  ChevronDown
} from "lucide-react"

interface TopBarProps {
  title?: string
  showDateFilter?: boolean
}

export function TopBar({ title = "Usage Statistics", showDateFilter = true }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left section - Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your personal usage statistics and compute consumption across different tools and time periods.
          </p>
        </div>

        {/* Right section - Simple controls */}
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          {showDateFilter && (
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Last 7 days
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}

          {/* Search */}
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>

          {/* Filter */}
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
            <Badge variant="secondary" className="ml-1">2</Badge>
          </Button>

          {/* Notifications */}
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4" />
          </Button>

          {/* User initial */}
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            U
          </div>
        </div>
      </div>
    </header>
  )
} 