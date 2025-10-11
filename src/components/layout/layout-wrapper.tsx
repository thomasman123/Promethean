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
        // Everyone now uses modern layout by default
        setLayoutPreference("modern")
      } catch (error) {
        console.error('Error setting layout preference:', error)
        setLayoutPreference("modern")
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

