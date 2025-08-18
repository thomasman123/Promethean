"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/useAuth"
import { Settings, Users, Calendar, Zap, Target } from "lucide-react"

export default function AccountPage() {
  const { user, loading, getAccountBasedPermissions, getSelectedAccount, accountChangeTimestamp } = useAuth()
  const router = useRouter()
  const permissions = getAccountBasedPermissions()
  const selectedAccount = getSelectedAccount()

  // Force re-render when account changes (even though data is reactive, this ensures UI updates)
  const accountData = React.useMemo(() => ({
    permissions,
    selectedAccount,
    timestamp: accountChangeTimestamp
  }), [permissions, selectedAccount, accountChangeTimestamp])

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!permissions.canManageAccount) {
      router.replace('/dashboard')
      return
    }
  }, [user, loading, permissions.canManageAccount, router])

  if (loading || !user || !permissions.canManageAccount) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access account settings.</p>
          </div>
        </div>
      </SidebarInset>
    )
  }

  const accountSections = [
    {
      title: "CRM Connection",
      description: "Connect your CRM to sync leads and opportunities",
      icon: Zap,
      href: "/account/crm-connection",
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Calendar Mapping", 
      description: "Map your calendar for appointment scheduling",
      icon: Calendar,
      href: "/account/calendar-mapping",
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "UTM Rules",
      description: "Define how UTM parameters map to sources for attribution",
      icon: Target,
      href: "/account/utm-rules",
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Team Members",
      description: "Manage team access and permissions",
      icon: Users,
      href: "/account/team-members",
      available: permissions.canManageTeam,

      requiredRole: "Moderator or Admin"
    }
  ]

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-muted-foreground">Manage account settings and integrations</p>
        </div>
      </div>
    </SidebarInset>
  )
} 