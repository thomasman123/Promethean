"use client"

import { SidebarInset } from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/manage-accounts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Manage Accounts</CardTitle>
                <CardDescription>View and manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Control user access, roles, and account settings</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </SidebarInset>
  )
} 