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
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdmin()) {
      router.replace('/dashboard')
      return
    }
  }, [user, loading, isAdmin, router])

  if (loading) {
    return null
  }

  if (!user || !isAdmin()) {
    return null
  }

  return <>{children}</>
} 