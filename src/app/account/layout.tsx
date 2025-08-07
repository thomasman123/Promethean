"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, getAccountBasedPermissions } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If no user, redirect to login
    if (!user) {
      router.replace('/login')
      return
    }

    // Check account-based permissions instead of just global role
    const permissions = getAccountBasedPermissions()
    if (!permissions.canManageAccount) {
      router.replace('/dashboard')
      return
    }
  }, [user, loading, getAccountBasedPermissions, router])

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

  // Show unauthorized message for unauthorized users
  const permissions = getAccountBasedPermissions()
  if (!user || !permissions.canManageAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access account settings.
          </p>
          <p className="text-sm text-muted-foreground">
            Only moderators and administrators can manage account settings.
          </p>
        </div>
      </div>
    )
  }

  // Render account content for authorized users
  return <>{children}</>
} 