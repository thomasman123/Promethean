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
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    const permissions = getAccountBasedPermissions()
    if (!permissions.canManageAccount) {
      router.replace('/dashboard')
      return
    }
  }, [user, loading, getAccountBasedPermissions, router])

  if (loading) {
    return null
  }

  const permissions = getAccountBasedPermissions()
  if (!user || !permissions.canManageAccount) {
    return null
  }

  return <>{children}</>
} 