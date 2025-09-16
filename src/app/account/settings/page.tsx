"use client"

import { useState, useEffect, Suspense } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { clearTimezoneCache, getCurrentTimeFormatted } from '@/lib/timezone-utils'
import { Clock, Globe, Building2, Settings, Save, RefreshCw, AlertCircle, Bell, Loader2 } from "lucide-react"

// Common timezones for business use
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Global' },
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Australia' },
]

interface Account {
  id: string
  name: string
  description?: string
  business_timezone: string
  created_at: string
  is_active: boolean
}

function AccountSettingsContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_timezone: 'UTC'
  })
  const { toast } = useToast()
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!userLoading && effectiveUser && selectedAccountId) {
      checkAccess()
    }
  }, [effectiveUser, selectedAccountId, userLoading])

  const checkAccess = async () => {
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
      fetchAccountDetails()
    } catch (error) {
      console.error('Error checking access:', error)
      setHasAccess(false)
      setLoading(false)
    }
  }

  const fetchAccountDetails = async () => {
    if (!selectedAccountId) return

    try {
      const { data: accountData, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', selectedAccountId)
        .single()

      if (error) throw error

      setAccount(accountData)
      setFormData({
        name: accountData.name || '',
        description: accountData.description || '',
        business_timezone: accountData.business_timezone || 'UTC'
      })
    } catch (error) {
      console.error('Error fetching account details:', error)
      toast({
        title: "Error",
        description: "Failed to load account details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedAccountId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: formData.name,
          description: formData.description,
          business_timezone: formData.business_timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccountId)

      if (error) throw error

      // Clear timezone cache
      clearTimezoneCache(selectedAccountId)

      toast({
        title: "Settings Saved",
        description: "Account settings have been updated successfully.",
      })

      // Refresh account details
      await fetchAccountDetails()

    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save account settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const getTimezonePreview = (timezone: string) => {
    try {
      return getCurrentTimeFormatted(timezone, 'MMM d, yyyy h:mm a')
    } catch {
      return 'Invalid timezone'
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-2xl mx-auto">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                Only account admins and moderators can manage account settings.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (!selectedAccountId) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Account Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage account information and timezone settings
              </p>
            </div>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter account name"
                  />
                </div>
                <div>
                  <Label>Account ID</Label>
                  <Input value={account?.id || ''} disabled className="bg-muted" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="account-description">Description</Label>
                <Textarea
                  id="account-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional account description"
                  rows={3}
                />
              </div>

              {account && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>Created: {new Date(account.created_at).toLocaleDateString()}</div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Select Timezone</Label>
                  <Select
                    value={formData.business_timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <div className="flex flex-col">
                            <span>{tz.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {getTimezonePreview(tz.value)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Current Time Preview</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono">
                      {getTimezonePreview(formData.business_timezone)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-1">Important Note</h4>
                <p className="text-sm text-blue-800">
                  Changing the timezone will affect how all dates and times are displayed throughout the application, 
                  including dashboards, data views, appointments, and reports.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    }>
      <AccountSettingsContent />
    </Suspense>
  )
} 