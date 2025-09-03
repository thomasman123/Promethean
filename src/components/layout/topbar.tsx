"use client"

import { cn } from "@/lib/utils"
import { Images, HelpCircle, Bell, Sun, Moon, User } from "lucide-react"
import { useState } from "react"

export function TopBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  return (
    <div className="flex h-16 items-center justify-between px-6 topbar-transparent">
      <div className="flex items-center gap-4">
        {/* Left side - can add breadcrumbs or title here */}
      </div>
      
      <div className="flex items-center gap-2">
        <button className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
        )}>
          <Images className="h-4 w-4" />
          Gallery
        </button>
        
        <button className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
        )}>
          <HelpCircle className="h-4 w-4" />
          Support
        </button>
        
        <button className={cn(
          "rounded-md p-1.5 text-muted-foreground transition-colors",
          "hover:bg-secondary/50 hover:text-secondary-foreground"
        )}>
          <Bell className="h-5 w-5" />
        </button>
        
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors",
            "hover:bg-secondary/50 hover:text-secondary-foreground"
          )}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        <button className={cn(
          "ml-2 rounded-full bg-primary p-2 text-primary-foreground transition-colors",
          "hover:bg-primary/90"
        )}>
          <User className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
} 