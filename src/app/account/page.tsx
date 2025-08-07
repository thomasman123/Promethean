"use client"

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
  const { getAccountBasedPermissions, getSelectedAccount } = useAuth()
  const permissions = getAccountBasedPermissions()
  const selectedAccount = getSelectedAccount()

  const accountSections = [
    {
      title: "CRM Connection",
      description: "Connect your CRM to sync leads and opportunities",
      icon: Zap,
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Calendar Mapping", 
      description: "Map your calendar for appointment scheduling",
      icon: Calendar,
      available: permissions.canManageAccount,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Team Members",
      description: "Manage users and roles for this account",
      icon: Users,
      available: permissions.canManageTeam,
      requiredRole: "Moderator or Admin"
    },
    {
      title: "Account Settings",
      description: "Configure account preferences and settings",
      icon: Settings,
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-muted-foreground">
                Manage settings and configurations for {selectedAccount?.name || 'your account'}
              </p>
            </div>

            {permissions.isAccountSpecific && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200">
                    Account Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You are currently working within: <strong>{selectedAccount?.name}</strong>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Your role: <strong>{permissions.currentRole}</strong>
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {accountSections.map((section) => (
                <Card key={section.title} className={!section.available ? "opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <section.icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {section.available ? (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ Available for your role
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        ⚠ Requires: {section.requiredRole}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 