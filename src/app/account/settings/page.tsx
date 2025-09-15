'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useDashboard } from '@/lib/dashboard-context'
import { useAccountTimezone } from '@/hooks/use-account-timezone'
import { clearTimezoneCache, getCurrentTimeFormatted } from '@/lib/timezone-utils'
import { Clock, Globe, Building2, Settings, Save, RefreshCw, AlertCircle } from 'lucide-react'
import { useAccountsCache } from '@/hooks/use-accounts-cache'

// Common timezones for business use
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Global' },
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'North America' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)', region: 'Europe' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', region: 'Australia' },
]

interface Account {
  id: string
  name: string
  description?: string
  business_timezone: string
  created_at: string
  is_active: boolean
}

export default function AccountSettingsPage() {
  const { selectedAccountId } = useDashboard()
  const { accounts, refreshAccounts } = useAccountsCache()
  const { timezone: currentTimezone, getCurrentTime, refresh: refreshTimezone } = useAccountTimezone(selectedAccountId)
  const { toast } = useToast()

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_timezone: 'UTC'
  })

  // Load account details
  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const accountData = accounts.find(acc => acc.id === selectedAccountId)
      if (accountData) {
        loadAccountDetails(selectedAccountId)
      }
    }
  }, [selectedAccountId, accounts])

  const loadAccountDetails = async (accountId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setAccount(data.account)
        setFormData({
          name: data.account.name || '',
          description: data.account.description || '',
          business_timezone: data.account.business_timezone || 'UTC'
        })
      } else {
        throw new Error('Failed to load account details')
      }
    } catch (error) {
      console.error('Error loading account:', error)
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
      // Save basic account info
      const response = await fetch(`/api/accounts/${selectedAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          business_timezone: formData.business_timezone
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save account settings')
      }

      // Clear timezone cache and refresh
      clearTimezoneCache(selectedAccountId)
      await refreshTimezone()
      await refreshAccounts()

      toast({
        title: "Settings Saved",
        description: "Account settings have been updated successfully. All data will now display in the selected timezone.",
      })

      // Reload account details to show updated info
      await loadAccountDetails(selectedAccountId)

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

  const groupedTimezones = COMMON_TIMEZONES.reduce((acc, tz) => {
    if (!acc[tz.region]) acc[tz.region] = []
    acc[tz.region].push(tz)
    return acc
  }, {} as Record<string, typeof COMMON_TIMEZONES>)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Account Settings</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading account settings...
            </div>
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
          <div className="max-w-4xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Account Selected</AlertTitle>
              <AlertDescription>
                Please select an account from the dropdown to view settings.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-4xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Not Found</AlertTitle>
              <AlertDescription>
                The selected account could not be loaded.
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Account Settings</h1>
          </div>

      <div className="grid gap-6">
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
                <Input value={account.id} disabled className="bg-muted" />
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

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>Created: {new Date(account.created_at).toLocaleDateString()}</div>
              <Badge variant={account.is_active ? "default" : "secondary"}>
                {account.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Business Timezone
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              All dates and times throughout the application will be displayed in this timezone.
            </p>
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
                  <SelectContent className="max-h-80">
                    {Object.entries(groupedTimezones).map(([region, timezones]) => (
                      <div key={region}>
                        <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                          {region}
                        </div>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <div className="flex flex-col">
                              <span>{tz.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {getTimezonePreview(tz.value)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <Separator className="my-1" />
                      </div>
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
                including dashboards, data views, appointments, and reports. The change takes effect immediately after saving.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Active Timezone</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-medium">{currentTimezone}</div>
                  <div className="text-sm text-muted-foreground">
                    {getCurrentTime('EEEE, MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div>
                <Label>Current Time</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-mono text-lg">{getCurrentTime('h:mm:ss a')}</div>
                  <div className="text-sm text-muted-foreground">
                    In {currentTimezone}
                  </div>
                </div>
              </div>
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
      </div>
    </main>
  </div>
  )
} 