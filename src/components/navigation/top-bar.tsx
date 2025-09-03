"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Calendar,
  Filter,
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown
} from "lucide-react"

interface TopBarProps {
  title?: string
  showDateFilter?: boolean
}

export function TopBar({ title = "Usage Statistics", showDateFilter = true }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        {/* Left section - Title and date filter */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          
          {showDateFilter && (
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Last 7 days
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right section - Actions and user */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <Button variant="ghost" size="sm" className="gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Search</span>
          </Button>

          {/* Filter */}
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            <span className="hidden md:inline">Filter</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              2
            </Badge>
          </Button>

          {/* Support */}
          <Button variant="ghost" size="sm">
            <HelpCircle className="w-4 h-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 