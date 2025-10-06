"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { Settings, AlertCircle, Loader2, Globe, Save, RefreshCw } from "lucide-react"
import { ContactSyncTools } from "@/components/account/contact-sync-tools"
import { AppointmentBackfillTools } from "@/components/account/appointment-backfill-tools"
import { Loading } from "@/components/ui/loading"

// Simple timezone list
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentTimezone, setCurrentTimezone] = useState('UTC')
  const [newTimezone, setNewTimezone] = useState('UTC')
  
  const { toast } = useToast()
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!userLoading && effectiveUser && selectedAccountId) {
      checkAccessAndLoadData()
    }
  }, [effectiveUser, selectedAccountId, userLoading])

  const checkAccessAndLoadData = async () => {
    if (!effectiveUser || !selectedAccountId) return

    try {
      // Check if user is global admin
      const isGlobalAdmin = effectiveUser.role === 'admin'

      if (!isGlobalAdmin) {
        // Check if user is account moderator
        const { data: access } = await supabase
          .from('account_access')
          .select('role')
          .eq('user_id', effectiveUser.id)
          .eq('account_id', selectedAccountId)
          .eq('is_active', true)
          .single()

        if (!access || !['admin', 'moderator'].includes(access.role)) {
          setHasAccess(false)
          setLoading(false)
          return
        }
      }

      setHasAccess(true)
      
      // Load current timezone
      const { data: account } = await supabase
        .from('accounts')
        .select('business_timezone')
        .eq('id', selectedAccountId)
        .single()

      if (account) {
        setCurrentTimezone(account.business_timezone || 'UTC')
        setNewTimezone(account.business_timezone || 'UTC')
      }

    } catch (error) {
      console.error('Error:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTimezone = async () => {
    if (!selectedAccountId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ business_timezone: newTimezone })
        .eq('id', selectedAccountId)

      if (error) throw error

      setCurrentTimezone(newTimezone)
      toast({
        title: "Timezone Updated",
        description: "All data will now display in the selected timezone.",
      })

    } catch (error) {
      console.error('Error saving timezone:', error)
      toast({
        title: "Error",
        description: "Failed to update timezone",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="pt-16 p-6">
          <Loading text="Loading account settings..." />
        </main>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-2xl mx-auto">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                Only account admins and moderators can manage settings.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (!selectedAccountId) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-2xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Account Selected</AlertTitle>
              <AlertDescription>
                Please select an account from the dropdown to manage its settings.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      
      <main className="pt-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Account Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage account timezone and display preferences
              </p>
            </div>
          </div>

          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6" />
                Business Timezone
              </CardTitle>
              <CardDescription>
                All dates and times throughout the application will be displayed in this timezone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Current Timezone</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="font-medium">{currentTimezone}</div>
                  </div>
                </div>
                
                <div>
                  <Label>Select New Timezone</Label>
                  <Select value={newTimezone} onValueChange={setNewTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newTimezone !== currentTimezone && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Changing timezone will affect all dates and times displayed 
                    in dashboards, data views, appointments, and reports.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveTimezone} 
                  disabled={saving || newTimezone === currentTimezone}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Timezone
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Sync Tools */}
          <ContactSyncTools accountId={selectedAccountId} />

          {/* Appointment/Discovery Backfill */}
          <AppointmentBackfillTools accountId={selectedAccountId} />

          {/* Advanced Tracking Link */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Tracking</CardTitle>
              <CardDescription>Set up high‑accuracy tracking across your funnel and Meta Ads.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Learn how to install the pixel, configure webhooks, and verify attribution.
              </div>
              <Button asChild>
                <a href="/account/settings/advanced-tracking">Open Guide</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 