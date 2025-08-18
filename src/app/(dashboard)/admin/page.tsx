"use client"

import { SidebarInset } from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth()

  if (!user || loading) {
    return (
      <SidebarInset>
        <div className="p-4">Loading...</div>
      </SidebarInset>
    )
  }

  if (!isAdmin()) {
    return (
      <SidebarInset>
        <div className="p-4">Access denied</div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-muted-foreground">Manage app-level settings</p>
        </div>
      </div>
    </SidebarInset>
  )
} 