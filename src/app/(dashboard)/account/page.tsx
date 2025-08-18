"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  SidebarInset,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Users, Calendar, Zap, Target } from "lucide-react"

export default function AccountPage() {
  const { user, loading, getAccountBasedPermissions, getSelectedAccount, accountChangeTimestamp } = useAuth()
  const router = useRouter()
  const permissions = getAccountBasedPermissions()
  const selectedAccount = getSelectedAccount()

  const accountData = React.useMemo(() => ({
    permissions,
    selectedAccount,
    timestamp: accountChangeTimestamp
  }), [permissions, selectedAccount, accountChangeTimestamp])

  React.useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!permissions.canManageAccount) { router.replace('/dashboard'); return }
  }, [user, loading, permissions.canManageAccount, router])

  const [timezone, setTimezone] = React.useState<string>(selectedAccount?.business_timezone || 'UTC')
  const [savingTz, setSavingTz] = React.useState(false)
  const allTimezones = React.useMemo(() => [
    'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Australia/Sydney'
  ], [])

  const saveTimezone = async () => {
    if (!selectedAccount) return
    setSavingTz(true)
    try {
      const res = await fetch('/api/account/update-timezone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount.id, timezone })
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      console.warn('Failed to update timezone', e)
    } finally {
      setSavingTz(false)
    }
  }

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

        {selectedAccount && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Current Account</h3>
            <p className="text-sm text-muted-foreground">{selectedAccount.name}</p>
            {selectedAccount.description && (
              <p className="text-xs text-muted-foreground mt-1">{selectedAccount.description}</p>
            )}

            <div className="grid gap-2 md:grid-cols-3 items-end">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Business Timezone</label>
                <select value={timezone} onChange={(e)=>setTimezone(e.target.value)} className="w-full mt-1 border rounded px-3 py-2 bg-background">
                  {allTimezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Used to compute local dates for metrics and charts.</p>
              </div>
              <div>
                <button onClick={saveTimezone} disabled={savingTz} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
                  {savingTz ? 'Saving…' : 'Save Timezone'}
                </button>
              </div>
            </div>
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
    </SidebarInset>
  )
} 