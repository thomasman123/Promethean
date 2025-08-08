"use client"

import { useState, useEffect, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Calendar, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface GHLCalendar {
  id: string
  name: string
  description?: string
  teamId?: string
  locationId: string
  status?: string
}

interface CalendarMapping {
  id: string
  account_id: string
  ghl_calendar_id: string
  calendar_name: string
  calendar_description: string | null
  is_enabled: boolean
  target_table: 'appointments' | 'discoveries'
  created_at: string
  updated_at: string
}

export default function CalendarMappingPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [calendars, setCalendars] = useState<GHLCalendar[]>([])
  const [mappings, setMappings] = useState<CalendarMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestAccountRef = useRef<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAccountId) return
    // Immediately reflect account change in UI to avoid showing stale data
    latestAccountRef.current = selectedAccountId
    setCalendars([])
    setMappings([])
    setError(null)
    setNotice(null)
    setLoading(true)

    fetchCalendarsAndMappings()
  }, [selectedAccountId, accountChangeTimestamp])

  const fetchCalendarsAndMappings = async () => {
    if (!selectedAccountId) return
    const requestAccountId = selectedAccountId

    try {
      // Fetch GHL calendars (disable cache and add timestamp to avoid any stale caching)
      const ts = Date.now()
      const calendarsResponse = await fetch(`/api/ghl/calendars?accountId=${requestAccountId}&_ts=${ts}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      })
      const calendarsData = await calendarsResponse.json()

      // If user switched accounts while we were fetching, ignore this result
      if (latestAccountRef.current !== requestAccountId) return

      if (!calendarsResponse.ok) {
        // Handle expected states gracefully without throwing noisy errors
        if (calendarsResponse.status === 404 && (calendarsData?.error || '').toLowerCase().includes('no active ghl connection')) {
          setCalendars([])
          setNotice('No active GoHighLevel connection for this account. Connect it in Account → CRM Connection.')
        } else if (calendarsResponse.status === 401) {
          setCalendars([])
          setNotice('GoHighLevel token expired. Please reconnect your CRM in Account → CRM Connection.')
        } else if (calendarsResponse.status === 403) {
          setCalendars([])
          setNotice('This GoHighLevel token has no access to the selected location. Try reconnecting the CRM.')
        } else {
          // Unexpected
          throw new Error(calendarsData.error || 'Failed to fetch calendars')
        }
      } else {
        setCalendars(calendarsData.calendars || [])
        setNotice(null)
      }

      // Fetch existing mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('calendar_mappings')
        .select('*')
        .eq('account_id', requestAccountId)

      // If user switched accounts while we were fetching, ignore this result
      if (latestAccountRef.current !== requestAccountId) return

      if (mappingsError) {
        console.error('Error fetching mappings:', mappingsError)
      } else {
        setMappings(mappingsData || [])
      }

    } catch (error) {
      // Only set the error if this response is still relevant
      if (latestAccountRef.current === requestAccountId) {
        console.warn('Calendars load warning:', error)
        setError(error instanceof Error ? error.message : 'Failed to load calendars')
      }
    } finally {
      if (latestAccountRef.current === requestAccountId) {
        setLoading(false)
      }
    }
  }

  const refreshCalendars = async () => {
    setRefreshing(true)
    // Clear current data to signal refresh for current account
    if (selectedAccountId) {
      latestAccountRef.current = selectedAccountId
      setCalendars([])
      setMappings([])
      setError(null)
      setNotice(null)
      setLoading(true)
      await fetchCalendarsAndMappings()
    }
    setRefreshing(false)
  }

  const toggleCalendarEnabled = async (calendarId: string, enabled: boolean) => {
    if (!selectedAccountId) return

    try {
      const calendar = calendars.find(c => c.id === calendarId)
      if (!calendar) return

      if (enabled) {
        // Create or enable mapping
        const { error } = await supabase
          .from('calendar_mappings')
          .upsert({
            account_id: selectedAccountId,
            ghl_calendar_id: calendarId,
            calendar_name: calendar.name,
            calendar_description: calendar.description || null,
            is_enabled: true,
            target_table: 'appointments', // default
          }, {
            onConflict: 'account_id,ghl_calendar_id'
          })

        if (error) throw error
      } else {
        // Disable mapping
        const { error } = await supabase
          .from('calendar_mappings')
          .update({ is_enabled: false })
          .eq('account_id', selectedAccountId)
          .eq('ghl_calendar_id', calendarId)

        if (error) throw error
      }

      // Refresh mappings
      await fetchCalendarsAndMappings()
    } catch (error) {
      console.error('Error updating calendar mapping:', error)
      setError('Failed to update calendar mapping')
    }
  }

  const updateMappingTarget = async (mappingId: string, targetTable: 'appointments' | 'discoveries') => {
    try {
      const { error } = await supabase
        .from('calendar_mappings')
        .update({ target_table: targetTable })
        .eq('id', mappingId)

      if (error) throw error

      // Update local state
      setMappings(prev => prev.map(mapping => 
        mapping.id === mappingId 
          ? { ...mapping, target_table: targetTable }
          : mapping
      ))
    } catch (error) {
      console.error('Error updating mapping target:', error)
      setError('Failed to update mapping target')
    }
  }

  const getCalendarMapping = (calendarId: string) => {
    return mappings.find(m => m.ghl_calendar_id === calendarId)
  }

  const getStatusBadge = (calendar: GHLCalendar) => {
    const mapping = getCalendarMapping(calendar.id)
    
    if (mapping?.is_enabled) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Enabled</Badge>
    } else if (mapping && !mapping.is_enabled) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Disabled</Badge>
    } else {
      return <Badge variant="outline">Not Mapped</Badge>
    }
  }

  

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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/account">Account</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Calendar Mapping</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar Mapping</h1>
                <p className="text-muted-foreground">
                  Map GoHighLevel calendars to your internal appointment and discovery tables
                </p>
              </div>
              <Button
                onClick={refreshCalendars}
                disabled={refreshing}
                variant="outline"
              >
                {refreshing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh Calendars
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!error && notice && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading calendars...</p>
              </div>
            ) : calendars.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">No Calendars Found</h3>
                      <p className="text-muted-foreground">
                        No GoHighLevel calendars were found for this account. 
                        Make sure your GHL connection is active and you have calendars set up.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {calendars.map((calendar) => {
                  const mapping = getCalendarMapping(calendar.id)
                  const isEnabled = mapping?.is_enabled || false

                  return (
                    <Card key={calendar.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{calendar.name}</CardTitle>
                              {calendar.description && (
                                <CardDescription>{calendar.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(calendar)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Enable Calendar Sync</p>
                            <p className="text-xs text-muted-foreground">
                              Sync appointments from this calendar to your database
                            </p>
                          </div>
                          <Switch
                             checked={isEnabled}
                             onCheckedChange={(checked: boolean) => toggleCalendarEnabled(calendar.id, checked)}
                           />
                        </div>

                        {isEnabled && mapping && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Target Table</p>
                              <Select
                                value={mapping.target_table}
                                onValueChange={(value: 'appointments' | 'discoveries') => 
                                  updateMappingTarget(mapping.id, value)
                                }
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="appointments">Appointments</SelectItem>
                                  <SelectItem value="discoveries">Discoveries</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Choose which table to store appointments from this calendar
                              </p>
                            </div>

                            <div className="bg-muted p-3 rounded-lg text-sm">
                              <p className="font-medium mb-1">Mapping Details:</p>
                              <p>Calendar ID: <code className="text-xs">{calendar.id}</code></p>
                              <p>Target: <code className="text-xs">{mapping.target_table}</code> table</p>
                              <p>Status: <span className="text-green-600">Active</span></p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>About Calendar Mapping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Calendar mapping allows you to automatically sync appointments from your GoHighLevel calendars to your internal database tables.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">How it works:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Enable calendars:</strong> Choose which GHL calendars to sync</li>
                    <li><strong>Map to tables:</strong> Route appointments to either Appointments or Discoveries tables</li>
                    <li><strong>Automatic sync:</strong> New appointments are automatically added via webhooks</li>
                    <li><strong>Contact data:</strong> Includes contact name, email, phone, and appointment details</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 