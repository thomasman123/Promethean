"use client"

import React from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
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
  SidebarProvider,
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
      description: "Manage users and roles for this account",
      icon: Users,
      href: "/account/team-members",
      available: permissions.canManageTeam,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Account Settings",
      description: "Configure account preferences and settings",
      icon: Settings,
      href: "/account",
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    }
  ]

  return (
    <SidebarProvider>
      <AppSidebar />
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
              <h1 className="text-3xl font-bold tracking-tight">Account</h1>
            </div>
            <p className="text-muted-foreground">
              Manage account-level tools and settings for {selectedAccount?.name || 'your account'}.
            </p>

            {permissions.isAccountSpecific && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Account</CardTitle>
                  <CardDescription>
                    You are working within <strong>{selectedAccount?.name}</strong>. Your role: <strong>{permissions.currentRole}</strong>.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accountSections.map((section) => (
                <Link key={section.title} href={section.href} aria-disabled={!section.available}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!section.available ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <section.icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      </div>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {section.available ? (
                        <p className="text-sm text-muted-foreground">Open</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Requires: {section.requiredRole}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 