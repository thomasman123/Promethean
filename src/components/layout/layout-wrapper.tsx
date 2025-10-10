"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { ModernLayout } from "./modern-layout"
import { useEffectiveUser } from "@/hooks/use-effective-user"

interface LayoutContextType {
  layoutPreference: string
  isModern: boolean
}

const LayoutContext = createContext<LayoutContextType>({
  layoutPreference: "classic",
  isModern: false,
})

export function useLayout() {
  return useContext(LayoutContext)
}

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [layoutPreference, setLayoutPreference] = useState<string>("classic")
  const [loading, setLoading] = useState(true)
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()

  useEffect(() => {
    const fetchLayoutPreference = async () => {
      if (userLoading || !effectiveUser) {
        return
      }

      try {
        // Check if user is admin
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          setLayoutPreference("classic")
          setLoading(false)
          return
        }

        const data = await response.json()
        const isAdmin = data.user?.role === 'admin'

        if (!isAdmin) {
          // Non-admins always use classic layout
          setLayoutPreference("classic")
          setLoading(false)
          return
        }

        // Fetch user's layout preference
        const prefResponse = await fetch('/api/admin/layout-preference')
        if (prefResponse.ok) {
          const prefData = await prefResponse.json()
          setLayoutPreference(prefData.layoutPreference || "classic")
        } else {
          setLayoutPreference("classic")
        }
      } catch (error) {
        console.error('Failed to fetch layout preference:', error)
        setLayoutPreference("classic")
      } finally {
        setLoading(false)
      }
    }

    fetchLayoutPreference()
  }, [effectiveUser, userLoading])

  // Listen for layout preference changes
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      setLayoutPreference(event.detail.layoutPreference)
    }

    window.addEventListener('layoutPreferenceChanged' as any, handleLayoutChange)

    return () => {
      window.removeEventListener('layoutPreferenceChanged' as any, handleLayoutChange)
    }
  }, [])

  const contextValue = {
    layoutPreference,
    isModern: layoutPreference === "modern",
  }

  if (loading) {
    return (
      <LayoutContext.Provider value={contextValue}>
        <div className="min-h-screen">{children}</div>
      </LayoutContext.Provider>
    )
  }

  if (layoutPreference === "modern") {
    return (
      <LayoutContext.Provider value={contextValue}>
        <ModernLayout>{children}</ModernLayout>
      </LayoutContext.Provider>
    )
  }

  // Classic layout (existing TopBar layout)
  return (
    <LayoutContext.Provider value={contextValue}>
      <div className="min-h-screen">{children}</div>
    </LayoutContext.Provider>
  )
}

