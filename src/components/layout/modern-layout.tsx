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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  
  const { user: effectiveUser } = useEffectiveUser()
  const { accounts } = useAccountsCache(effectiveUser?.id)
  const { selectedAccountId } = useDashboard()

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

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

  // Check dark mode
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
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

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

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

      {/* Top Bar for Mobile/Desktop */}
      <div
        className={cn(
          "fixed right-0 top-0 z-30 flex items-center justify-end gap-3 p-4",
          "transition-all duration-300",
          sidebarCollapsed ? "md:left-16" : "md:left-60",
          "left-0",
          isImpersonating && "top-10"
        )}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "p-4 md:p-6",
          sidebarCollapsed ? "md:ml-16" : "md:ml-60",
          isImpersonating && "pt-14"
        )}
      >
        <div className="h-full">
          {/* Rounded content container */}
          <div className="h-full rounded-2xl border border-border/40 bg-muted/20 p-6 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

