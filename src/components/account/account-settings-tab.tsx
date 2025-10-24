"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { Globe, RefreshCw, Save, AlertCircle } from "lucide-react"
import { ContactSyncTools } from "@/components/account/contact-sync-tools"
import { AppointmentBackfillTools } from "@/components/account/appointment-backfill-tools"
import { CallBackfillTools } from "@/components/account/call-backfill-tools"
import { Loading } from "@/components/ui/loading"

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

interface AccountSettingsTabProps {
  selectedAccountId: string | null
  hasAccess: boolean
}

export function AccountSettingsTab({ selectedAccountId, hasAccess }: AccountSettingsTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTimezone, setCurrentTimezone] = useState('UTC')
  const [newTimezone, setNewTimezone] = useState('UTC')
  
  const { toast } = useToast()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (selectedAccountId && hasAccess) {
      loadTimezone()
    }
  }, [selectedAccountId, hasAccess])

  const loadTimezone = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/accounts/${selectedAccountId}/timezone`)
      if (response.ok) {
        const data = await response.json()
        setCurrentTimezone(data.timezone || 'UTC')
        setNewTimezone(data.timezone || 'UTC')
      }
    } catch (error) {
      console.error('Error loading timezone:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTimezone = async () => {
    if (!selectedAccountId) return

    setSaving(true)
    try {
      const response = await fetch('/api/account/update-timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          timezone: newTimezone
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update timezone')
      }

      toast({
        title: "Success",
        description: "Timezone updated successfully"
      })

      setCurrentTimezone(newTimezone)
    } catch (error) {
      console.error('Error updating timezone:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update timezone",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (!hasAccess) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          Only account moderators and admins can manage settings.
        </AlertDescription>
      </Alert>
    )
  }

  if (!selectedAccountId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Account Selected</AlertTitle>
        <AlertDescription>
          Please select an account from the dropdown to manage its settings.
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return <Loading text="Loading account settings..." />
  }

  return (
    <div className="space-y-6">
      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
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
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
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

      {/* Call Backfill */}
      <CallBackfillTools accountId={selectedAccountId} />

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
  )
}

