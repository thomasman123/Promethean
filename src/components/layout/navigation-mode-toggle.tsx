"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PanelLeft, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavigationModeToggle() {
  const [navigationMode, setNavigationMode] = useState<'topbar' | 'sidebar'>('topbar')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.user?.role === 'admin')
        }
      } catch (error) {
        console.error('Failed to check admin status:', error)
      }
    }

    checkAdmin()

    // Load saved preference
    const savedMode = localStorage.getItem('navigationMode') as 'topbar' | 'sidebar' | null
    if (savedMode) {
      setNavigationMode(savedMode)
    }
  }, [])

  const toggleNavigationMode = () => {
    const newMode = navigationMode === 'topbar' ? 'sidebar' : 'topbar'
    setNavigationMode(newMode)
    localStorage.setItem('navigationMode', newMode)
    
    // Dispatch event to trigger page reload/update
    window.dispatchEvent(new CustomEvent('navigationModeChanged', { 
      detail: { mode: newMode } 
    }))
    
    // Force page reload to apply new layout
    window.location.reload()
  }

  // Only show toggle to admins
  if (!isAdmin) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleNavigationMode}
      className={cn(
        "justify-start gap-3",
        navigationMode === 'sidebar' ? "w-full" : "h-8"
      )}
      title="Switch navigation layout (Admin only)"
    >
      {navigationMode === 'topbar' ? (
        <>
          <PanelLeft className="h-4 w-4" />
          {navigationMode === 'sidebar' && <span className="text-sm">Switch to Top Bar</span>}
        </>
      ) : (
        <>
          <Navigation className="h-4 w-4" />
          {navigationMode === 'sidebar' && <span className="text-sm">Switch to Top Bar</span>}
        </>
      )}
    </Button>
  )
}

// Hook to get current navigation mode
export function useNavigationMode() {
  const [navigationMode, setNavigationMode] = useState<'topbar' | 'sidebar'>('topbar')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.user?.role === 'admin')
        }
      } catch (error) {
        console.error('Failed to check admin status:', error)
      }
    }

    checkAdmin()

    // Load saved preference - only for admins
    const savedMode = localStorage.getItem('navigationMode') as 'topbar' | 'sidebar' | null
    if (savedMode && isAdmin) {
      setNavigationMode(savedMode)
    } else {
      setNavigationMode('topbar') // Non-admins always get topbar
    }

    // Listen for navigation mode changes
    const handleNavigationModeChanged = (event: CustomEvent) => {
      setNavigationMode(event.detail.mode)
    }

    window.addEventListener('navigationModeChanged' as any, handleNavigationModeChanged)

    return () => {
      window.removeEventListener('navigationModeChanged' as any, handleNavigationModeChanged)
    }
  }, [isAdmin])

  return { navigationMode: isAdmin ? navigationMode : 'topbar', isAdmin }
}

