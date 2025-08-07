"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If no user, redirect to login
    if (!user) {
      router.replace('/login')
      return
    }

    // If user is not admin, redirect to dashboard
    if (!isAdmin()) {
      router.replace('/dashboard')
      return
    }
  }, [user, loading, isAdmin, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized message for non-admin users
  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this area.
          </p>
        </div>
      </div>
    )
  }

  // Render admin content for authorized users
  return <>{children}</>
} 