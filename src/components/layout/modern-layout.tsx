"use client"

import { useState, useEffect } from "react"
import { ModernSidebar } from "./modern-sidebar"
import { cn } from "@/lib/utils"
import { Menu, X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImpersonationBar } from "./impersonation-bar"
import { useAccountsCache } from "@/hooks/use-accounts-cache"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"

interface ModernLayoutProps {
  children: React.ReactNode
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Check sidebar collapsed state
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("sidebarCollapsed")
      setSidebarCollapsed(saved === "true")
    }
    
    handleStorage()
    window.addEventListener("storage", handleStorage)
    
    // Also check periodically since localStorage events don't fire in same tab
    const interval = setInterval(handleStorage, 500)
    
    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Check impersonation
  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch('/api/auth/impersonation')
        const data = await response.json()
        setIsImpersonating(!!data.impersonatedUserId)
      } catch (error) {
        console.error('Failed to check impersonation:', error)
      }
    }
    checkImpersonation()
  }, [])


  return (
    <div className="min-h-screen bg-background">
      <ImpersonationBar />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ModernSidebar />
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 h-screen w-60 z-50">
            <ModernSidebar />
          </div>
        </>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "fixed inset-0 transition-all duration-300",
          sidebarCollapsed ? "md:left-16" : "md:left-60",
          isImpersonating && "top-10"
        )}
      >
        <div className="h-full p-2 md:p-3">
          {/* Rounded content container with scrollable inside */}
          <div className="h-full rounded-2xl border-2 border-border/60 bg-muted/20 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

