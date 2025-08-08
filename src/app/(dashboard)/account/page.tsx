"use client"

import React from "react"
import Link from "next/link"
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
import { Settings, Users, Calendar, Zap } from "lucide-react"

export default function AccountPage() {
  const { getAccountBasedPermissions, getSelectedAccount, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const selectedAccount = getSelectedAccount()

  // Force re-render when account changes (even though data is reactive, this ensures UI updates)
  const accountData = React.useMemo(() => ({
    permissions,
    selectedAccount,
    timestamp: accountChangeTimestamp
  }), [permissions, selectedAccount, accountChangeTimestamp])

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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account settings and integrations
          </p>
          
          {selectedAccount && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-medium">Current Account</h3>
              <p className="text-sm text-muted-foreground">{selectedAccount.name}</p>
              {selectedAccount.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedAccount.description}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {accountSections.map((section) => (
              <div key={section.title}>
                {section.available ? (
                  <Link href={section.href}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <section.icon className="h-5 w-5" />
                          {section.title}
                        </CardTitle>
                        <CardDescription>
                          {section.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-green-600">Available</p>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Card className="opacity-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <section.icon className="h-5 w-5" />
                        {section.title}
                      </CardTitle>
                      <CardDescription>
                        {section.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Requires {section.requiredRole} role
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarInset>
  )
} 