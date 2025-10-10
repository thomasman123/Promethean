"use client"

import { ReactNode } from "react"
import { TopBar } from "./topbar"
import { ModernSidebar } from "./modern-sidebar"
import { useNavigationMode } from "./navigation-mode-toggle"
import { WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { cn } from "@/lib/utils"

interface PageLayoutProps {
  children: ReactNode
  onAddWidget?: (widget: WidgetConfig) => void
}

export function PageLayout({ children, onAddWidget }: PageLayoutProps) {
  const { navigationMode, isAdmin } = useNavigationMode()
  const useSidebar = isAdmin && navigationMode === 'sidebar'

  return (
    <div className="min-h-screen">
      {useSidebar ? (
        <ModernSidebar onAddWidget={onAddWidget} />
      ) : (
        <TopBar onAddWidget={onAddWidget} />
      )}
      
      <main className={cn(
        "h-screen overflow-y-auto",
        useSidebar ? "pl-64 pt-14" : "pt-16"
      )}>
        {children}
      </main>
    </div>
  )
}

