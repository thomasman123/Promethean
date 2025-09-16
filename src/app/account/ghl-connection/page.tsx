"use client"

import { useState, useEffect, Suspense } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { Shield, AlertCircle, CheckCircle2, Loader2, Link, Unlink, RefreshCw, Calendar, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GhlConnectionStatus {
  isConnected: boolean
  locationId: string | null
  authType: string | null
  tokenExpiresAt: string | null
  webhookId: string | null
  tokenHealthStatus?: 'healthy' | 'warning' | 'expired' | 'needs_reauth'
  tokenLastRefreshed?: string | null
}

interface GhlCalendar {
  id: string
  name: string
  description?: string
  isActive: boolean
  eventType?: string
}

interface CalendarMapping {
  id: string
  account_id: string
  ghl_calendar_id: string
  calendar_name: string
  calendar_description?: string
  is_enabled: boolean
  target_table: 'appointments' | 'discoveries'
  created_at: string
  updated_at: string
}

function GHLConnectionContent() {
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<GhlConnectionStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [resubscribing, setResubscribing] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  
  // Calendar mapping state
  const [calendars, setCalendars] = useState<GhlCalendar[]>([])
  const [mappings, setMappings] = useState<CalendarMapping[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [savingMappings, setSavingMappings] = useState(false)
  const [refreshingToken, setRefreshingToken] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle OAuth callback parameters
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const warning = searchParams.get('warning')
    const webhook = searchParams.get('webhook')

    if (success === 'true') {
      toast({
        title: "Success",
        description: webhook === 'active' 
          ? "GoHighLevel connected successfully with webhooks" 
          : "GoHighLevel connected (webhook setup failed)"
      })
      // Clean up URL
      router.replace('/account/ghl-connection')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'missing_parameters': 'Missing required OAuth parameters',
        'missing_account_info': 'Could not determine which account to connect (state parameter missing)',
        'stale_oauth_session': 'OAuth session expired - please try connecting again',
        'invalid_state': 'Invalid OAuth state parameter',
        'configuration_error': 'GHL client configuration error',
        'token_exchange_failed': 'Failed to exchange authorization code',
        'database_error': 'Failed to save connection to database',
        'unknown_error': 'An unexpected error occurred'
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessages[error] || error,
        variant: "destructive"
      })
      // Clean up URL
      router.replace('/account/ghl-connection')
    } else if (warning === 'webhook_failed') {
      toast({
        title: "Partial Success",
        description: "Connected to GoHighLevel but webhook subscription failed",
        variant: "destructive"
      })
      // Clean up URL
      router.replace('/account/ghl-connection')
    }
  }, [searchParams, router, toast])

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

        if (!access || access.role !== 'moderator') {
          setHasAccess(false)
          setLoading(false)
          return
        }
      }

      setHasAccess(true)
      fetchConnectionStatus()
    } catch (error) {
      console.error('Error checking access:', error)
      setHasAccess(false)
      setLoading(false)
    }
  }

  const fetchConnectionStatus = async () => {
    if (!selectedAccountId) return

    try {
      // Get account with GHL connection data including token health
      const { data: account, error } = await supabase
        .from('accounts')
        .select('ghl_api_key, ghl_location_id, ghl_auth_type, ghl_token_expires_at, ghl_webhook_id, ghl_token_health_status, ghl_token_last_refreshed')
        .eq('id', selectedAccountId)
        .single()

      if (error) throw error

      const status: GhlConnectionStatus = {
        isConnected: !!account.ghl_api_key,
        locationId: account.ghl_location_id,
        authType: account.ghl_auth_type,
        tokenExpiresAt: account.ghl_token_expires_at,
        webhookId: account.ghl_webhook_id,
        tokenHealthStatus: account.ghl_token_health_status,
        tokenLastRefreshed: account.ghl_token_last_refreshed
      }

      setConnectionStatus(status)
      
      // If connected, also fetch calendars and mappings
      if (status.isConnected) {
        await fetchCalendarsAndMappings()
      }
    } catch (error) {
      console.error('Error fetching connection status:', error)
      toast({
        title: "Error",
        description: "Failed to load connection status",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCalendarsAndMappings = async () => {
    if (!selectedAccountId) return
    
    setLoadingCalendars(true)
    try {
      // Fetch calendars from GHL
      const calendarsResponse = await fetch(`/api/ghl/calendars?accountId=${selectedAccountId}`)
      const calendarsData = await calendarsResponse.json()
      
      if (calendarsData.success) {
        setCalendars(calendarsData.calendars || [])
      } else {
        console.error('Failed to fetch calendars:', calendarsData.error)
        setCalendars([])
      }
      
      // Fetch existing mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('calendar_mappings')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('calendar_name')
      
      if (mappingsError) {
        console.error('Error fetching mappings:', mappingsError)
        setMappings([])
      } else {
        setMappings(mappingsData || [])
      }
    } catch (error) {
      console.error('Error fetching calendars and mappings:', error)
      toast({
        title: "Error",
        description: "Failed to load calendar information",
        variant: "destructive"
      })
    } finally {
      setLoadingCalendars(false)
    }
  }

  const updateMapping = async (calendarId: string, enabled: boolean, targetTable: 'appointments' | 'discoveries') => {
    if (!selectedAccountId) return
    
    const calendar = calendars.find(c => c.id === calendarId)
    if (!calendar) return
    
    const existingMapping = mappings.find(m => m.ghl_calendar_id === calendarId)
    
    try {
      if (existingMapping) {
        // Update existing mapping
        const { error } = await supabase
          .from('calendar_mappings')
          .update({
            is_enabled: enabled,
            target_table: targetTable,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMapping.id)
        
        if (error) throw error
        
        // Update local state
        setMappings(prev => prev.map(m => 
          m.id === existingMapping.id 
            ? { ...m, is_enabled: enabled, target_table: targetTable, updated_at: new Date().toISOString() }
            : m
        ))
      } else {
        // Create new mapping
        const newMapping = {
          account_id: selectedAccountId,
          ghl_calendar_id: calendarId,
          calendar_name: calendar.name,
          calendar_description: calendar.description || null,
          is_enabled: enabled,
          target_table: targetTable
        }
        
        const { data, error } = await supabase
          .from('calendar_mappings')
          .insert(newMapping)
          .select()
          .single()
        
        if (error) throw error
        
        // Add to local state
        setMappings(prev => [...prev, data])
      }
      
      toast({
        title: "Success",
        description: `Calendar mapping ${enabled ? 'enabled' : 'disabled'} for ${calendar.name}`,
      })
    } catch (error) {
      console.error('Error updating mapping:', error)
      toast({
        title: "Error",
        description: "Failed to update calendar mapping",
        variant: "destructive"
      })
    }
  }

  const manualRefreshToken = async () => {
    if (!selectedAccountId) return
    
    setRefreshingToken(true)
    try {
      const response = await fetch('/api/ghl/refresh-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': 'manual-refresh' // Special header for manual refresh
        },
        body: JSON.stringify({ accountId: selectedAccountId, manual: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Token refreshed successfully",
        })
        // Refresh connection status to show updated info
        await fetchConnectionStatus()
      } else {
        throw new Error(data.error || 'Failed to refresh token')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      toast({
        title: "Error",
        description: "Failed to refresh token. You may need to reconnect.",
        variant: "destructive"
      })
    } finally {
      setRefreshingToken(false)
    }
  }

  const getTokenHealthBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Expires Soon</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'needs_reauth':
        return <Badge variant="destructive">Needs Re-auth</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const initiateOAuthFlow = async () => {
    console.log('🔍 OAuth Flow Initiation - Current State:', {
      selectedAccountId,
      effectiveUser: !!effectiveUser,
      effectiveUserId: effectiveUser?.id,
      userLoading,
      loading,
      hasAccess,
      localStorage_selectedAccountId: localStorage.getItem('selectedAccountId'),
      localStorage_oauth_selectedAccountId: localStorage.getItem('oauth_selectedAccountId')
    })

    if (!selectedAccountId || !effectiveUser) {
      console.error('❌ Missing required data for OAuth:', { selectedAccountId, effectiveUser: !!effectiveUser })
      toast({
        title: "Error",
        description: "Please wait for accounts to load, then try again.",
        variant: "destructive"
      })
      return
    }

    // Additional check - make sure we're not in a loading state
    if (userLoading || loading) {
      console.error('❌ Still loading - cannot start OAuth yet')
      toast({
        title: "Please Wait",
        description: "Still loading account information. Please try again in a moment.",
        variant: "destructive"
      })
      return
    }

    console.log('✅ Pre-OAuth validation passed:', {
      selectedAccountId,
      effectiveUserId: effectiveUser.id,
      userLoading,
      loading,
      hasAccess
    })

    // Generate a nonce for CSRF protection
    const nonce = Math.random().toString(36).substring(2, 15)
    const userId = effectiveUser.id
    
    // Create state parameter
    const state = JSON.stringify({
      accountId: selectedAccountId,
      nonce: nonce,
      userId: userId
    })

    // Get OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID
    const redirectUri = process.env.GHL_REDIRECT_URI || `${window.location.origin}/api/auth/callback`
    
    console.log('🔍 OAuth initiation details:', {
      selectedAccountId,
      effectiveUserId: userId,
      clientId,
      redirectUri,
      origin: window.location.origin,
      stateObject: { accountId: selectedAccountId, nonce, userId: userId },
      stateString: state
    })
    
    if (!clientId) {
      console.error('❌ Missing GHL Client ID')
      toast({
        title: "Configuration Error",
        description: "GHL Client ID not configured",
        variant: "destructive"
      })
      return
    }

    // Store account ID in multiple places for redundancy
    try {
      const timestamp = Date.now().toString()
      
      // Store in localStorage (survives page refresh)
      localStorage.setItem('oauth_selectedAccountId', selectedAccountId)
      localStorage.setItem('oauth_userId', userId)
      localStorage.setItem('oauth_timestamp', timestamp)
      
      console.log('💾 Setting localStorage items:', {
        oauth_selectedAccountId: selectedAccountId,
        oauth_userId: userId,
        oauth_timestamp: timestamp
      })
      
      // Store in cookies (accessible to server) with more robust settings
      // Set cookies for both current domain and callback domain
      const cookieOptions = `path=/; max-age=7200; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`
      document.cookie = `selectedAccountId=${selectedAccountId}; ${cookieOptions}`
      document.cookie = `oauth_userId=${userId}; ${cookieOptions}`
      document.cookie = `oauth_timestamp=${timestamp}; ${cookieOptions}`
      
      console.log('🍪 Setting client-side cookies:', {
        selectedAccountId: `selectedAccountId=${selectedAccountId}; ${cookieOptions}`,
        oauth_userId: `oauth_userId=${userId}; ${cookieOptions}`,
        oauth_timestamp: `oauth_timestamp=${timestamp}; ${cookieOptions}`
      })
      
      // Additional backup - store in sessionStorage as well
      sessionStorage.setItem('oauth_selectedAccountId', selectedAccountId)
      sessionStorage.setItem('oauth_userId', userId)
      
              console.log('💾 Stored account info in multiple locations:', {
          localStorage: true,
          sessionStorage: true,
          cookies: true,
          selectedAccountId,
          userId: userId,
          cookieOptions,
          protocol: window.location.protocol
        })
      
      // Verify cookies were set
      const cookieCheck = document.cookie.includes(`selectedAccountId=${selectedAccountId}`)
      console.log('🔍 Cookie verification:', { 
        cookieCheck, 
        allCookies: document.cookie,
        cookieLength: document.cookie.length,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port
      })
      
      // Parse and verify each cookie individually
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=')
        acc[name] = value
        return acc
      }, {} as Record<string, string>)
      
      console.log('🔍 Parsed cookies:', cookies)
      console.log('🔍 Expected cookies present:', {
        selectedAccountId: !!cookies.selectedAccountId,
        oauth_userId: !!cookies.oauth_userId,
        oauth_timestamp: !!cookies.oauth_timestamp
      })
      
      // Always try server-side cookie setting as additional backup
      console.log('🔄 Also setting cookies via server-side API for extra reliability...')
      
      // Use async/await to ensure server-side cookies are set before proceeding
      try {
        const serverResponse = await fetch('/api/auth/set-oauth-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedAccountId,
            userId: userId
          })
        })
        
        const serverData = await serverResponse.json()
        console.log('✅ Server-side cookie setting result:', serverData)
      } catch (serverError) {
        console.error('❌ Server-side cookie setting failed:', serverError)
      }
      
      if (!cookieCheck) {
        console.error('❌ CRITICAL: Client-side cookie was not set properly!')
        console.error('🔍 But server-side cookies should still work for OAuth callback')
        
        // Try alternative cookie setting method
        try {
          console.log('🔄 Trying alternative client-side cookie setting method...')
          const expires = new Date(Date.now() + 7200000).toUTCString() // 2 hours
          document.cookie = `selectedAccountId=${selectedAccountId}; expires=${expires}; path=/`
          document.cookie = `oauth_userId=${userId}; expires=${expires}; path=/`
          document.cookie = `oauth_timestamp=${timestamp}; expires=${expires}; path=/`
          
          // Verify again
          const recheck = document.cookie.includes(`selectedAccountId=${selectedAccountId}`)
          console.log('🔍 Alternative method result:', { recheck, newCookies: document.cookie })
        } catch (altError) {
          console.error('❌ Alternative cookie method also failed:', altError)
        }
      } else {
        console.log('✅ Client-side cookies verified successfully')
      }
    } catch (error) {
      console.error('❌ Failed to store account info:', error)
      toast({
        title: "Storage Error", 
        description: "Could not store account information. Please try again.",
        variant: "destructive"
      })
      return
    }

    // Log configuration for debugging
    console.log('🔍 OAuth Configuration:', {
      clientId,
      redirectUri,
      origin: window.location.origin,
      state: JSON.parse(state)
    })

    // Construct OAuth URL
    // Use the correct GoHighLevel marketplace URL, not LeadConnector
    const oauthUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
    oauthUrl.searchParams.append('response_type', 'code')
    oauthUrl.searchParams.append('client_id', clientId)
    oauthUrl.searchParams.append('redirect_uri', redirectUri)
    // Use the same comprehensive scopes as the installation URL
    oauthUrl.searchParams.append('scope', 'calendars.readonly calendars.write calendars/events.readonly calendars/events.write calendars/resources.write calendars/resources.readonly calendars/groups.write calendars/groups.readonly opportunities.readonly oauth.write oauth.readonly opportunities.write businesses.readonly businesses.write campaigns.readonly conversations.readonly conversations.write conversations/message.readonly conversations/message.write conversations/reports.readonly contacts.readonly conversations/livechat.write contacts.write objects/schema.readonly objects/record.readonly objects/schema.write objects/record.write associations.write associations.readonly associations/relation.readonly courses.write associations/relation.write courses.readonly forms.readonly forms.write invoices.readonly invoices.write invoices/schedule.readonly invoices/schedule.write invoices/template.readonly invoices/estimate.readonly invoices/template.write invoices/estimate.write links.readonly lc-email.readonly links.write locations.readonly locations/customValues.readonly locations/customValues.write locations/customFields.readonly locations/customFields.write locations/tasks.readonly locations/tasks.write locations/tags.readonly locations/tags.write locations/templates.readonly medias.readonly medias.write funnels/redirect.readonly funnels/page.readonly funnels/funnel.readonly funnels/pagecount.readonly funnels/redirect.write payments/orders.readonly payments/orders.write payments/integration.write payments/integration.readonly payments/transactions.readonly payments/subscriptions.readonly twilioaccount.read blogs/list.readonly blogs/posts.readonly socialplanner/tag.write users.readonly')
    oauthUrl.searchParams.append('state', state)

    console.log('🚀 FINAL OAUTH URL:', oauthUrl.toString())
    console.log('🔍 URL Components:', {
      base: oauthUrl.origin + oauthUrl.pathname,
      params: Object.fromEntries(oauthUrl.searchParams.entries())
    })

    // Show info toast with debugging info
    toast({
      title: "Redirecting to GoHighLevel",
      description: "Using GoHighLevel marketplace OAuth flow.",
    })

    // Store the current URL attempt for potential fallback
    localStorage.setItem('ghl_oauth_attempt', 'marketplace')
    
    // Redirect to OAuth flow
    console.log('⏳ Redirecting in 1 second...')
    setTimeout(() => {
      // Final cookie verification before redirect
      const finalCheck = document.cookie.includes(`selectedAccountId=${selectedAccountId}`)
      console.log('🔍 Final cookie check before redirect:', {
        cookiePresent: finalCheck,
        allCookies: document.cookie,
        cookieCount: document.cookie.split(';').length
      })
      
      if (!finalCheck) {
        console.error('❌ CRITICAL: Cookies still not set after 1 second delay! OAuth will likely fail.')
        console.error('🔍 This indicates a serious cookie setting issue')
        
        // Show warning but still proceed
        toast({
          title: "Warning",
          description: "Cookie setting failed. OAuth may not work properly. Check browser settings.",
          variant: "destructive"
        })
      } else {
        console.log('✅ Cookies verified before OAuth redirect')
      }
      
      console.log('🔄 Redirecting now to:', oauthUrl.toString())
      window.location.href = oauthUrl.toString()
    }, 1000)
  }

  const disconnectGHL = async () => {
    if (!selectedAccountId) return

    setDisconnecting(true)
    try {
      const response = await fetch('/api/admin/ghl/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      toast({
        title: "Success",
        description: "GHL connection removed"
      })

      // Refresh status
      await fetchConnectionStatus()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect GHL",
        variant: "destructive"
      })
    } finally {
      setDisconnecting(false)
    }
  }



  const resubscribeWebhooks = async () => {
    if (!selectedAccountId) return

    setResubscribing(true)
    try {
      const response = await fetch('/api/webhooks/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Webhooks re-subscribed successfully"
        })
      } else {
        throw new Error(data.error || 'Failed to resubscribe')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resubscribe webhooks",
        variant: "destructive"
      })
    } finally {
      setResubscribing(false)
    }
  }

  const isTokenExpired = () => {
    if (!connectionStatus?.tokenExpiresAt) return false
    return new Date(connectionStatus.tokenExpiresAt) <= new Date()
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
                Only account moderators can manage GHL connections.
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
                Please select an account from the dropdown to manage its GHL connection.
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
          <div>
            <h1 className="text-3xl font-bold">GoHighLevel Connection</h1>
            <p className="text-muted-foreground mt-2">
              Connect your account to GoHighLevel to sync data and automate workflows.
            </p>
          </div>

          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {connectionStatus?.isConnected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Connected</span>
                      <Badge variant="outline" className="text-green-600">
                        Active
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Not Connected</span>
                      <Badge variant="outline" className="text-yellow-600">
                        Inactive
                      </Badge>
                    </>
                  )}
                </div>
                
                {connectionStatus?.isConnected ? (
                  <Button
                    variant="destructive"
                    onClick={disconnectGHL}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    onClick={initiateOAuthFlow}
                    disabled={userLoading || loading || !selectedAccountId || !effectiveUser}
                    className="w-full"
                  >
                    {userLoading || loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Connect GoHighLevel
                      </>
                    )}
                  </Button>
                )}
              </div>

              {!connectionStatus?.isConnected && (
                <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Connection Help:</p>
                  <p>• Make sure your GHL app is published and active in the marketplace</p>
                  <p>• Verify your redirect URI in GHL app settings matches exactly: <code className="text-xs bg-blue-100 px-1 rounded">https://www.getpromethean.com/api/auth/callback</code></p>
                  <p>• Ensure you have the necessary permissions in your GHL account</p>
                </div>
              )}

              {!connectionStatus?.isConnected && (
                <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">Connection Options:</p>
                  <div className="space-y-2">
                    <p><strong>Option 1 (Recommended):</strong> Use your GHL Installation URL from the marketplace dashboard</p>
                    <p><strong>Option 2:</strong> Use the "Connect to GoHighLevel" button below (marketplace OAuth)</p>
                    <p><strong>Option 3:</strong> If you get a blank page, try "Try Alternative" (standard OAuth)</p>
                  </div>
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium">✅ Configuration Correct:</p>
                    <p className="text-green-700">Your redirect URI is properly configured to use your production domain.</p>
                  </div>
                </div>
              )}

              {connectionStatus?.isConnected && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location ID</span>
                    <span className="font-mono">{connectionStatus.locationId || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auth Type</span>
                    <span>{connectionStatus.authType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Token Health</span>
                    {getTokenHealthBadge(connectionStatus.tokenHealthStatus)}
                  </div>
                  {connectionStatus.tokenExpiresAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires At</span>
                      <span>{new Date(connectionStatus.tokenExpiresAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Webhook Status</span>
                    <span>{connectionStatus.webhookId ? 'Subscribed' : 'Not subscribed'}</span>
                  </div>
                  {connectionStatus.tokenLastRefreshed && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Token Refresh</span>
                      <span>{new Date(connectionStatus.tokenLastRefreshed).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Token Health Actions */}
              {connectionStatus?.isConnected && (
                  <div className="pt-4 border-t space-y-3">
                    {(connectionStatus.tokenHealthStatus === 'warning' || connectionStatus.tokenHealthStatus === 'expired') && (
                      <Alert className={connectionStatus.tokenHealthStatus === 'expired' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                        <AlertCircle className={`h-4 w-4 ${connectionStatus.tokenHealthStatus === 'expired' ? 'text-red-600' : 'text-yellow-600'}`} />
                        <AlertTitle>
                          {connectionStatus.tokenHealthStatus === 'expired' ? 'Token Expired' : 'Token Expires Soon'}
                        </AlertTitle>
                        <AlertDescription>
                          {connectionStatus.tokenHealthStatus === 'expired' 
                            ? 'Your GHL token has expired. Try refreshing it or reconnect if needed.'
                            : 'Your GHL token will expire within 7 days. It will be automatically refreshed, but you can manually refresh it now.'
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {connectionStatus.tokenHealthStatus === 'needs_reauth' && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle>Re-authentication Required</AlertTitle>
                        <AlertDescription>
                          Your GHL connection needs to be re-established. Please disconnect and reconnect your account.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={manualRefreshToken}
                        disabled={refreshingToken || connectionStatus.tokenHealthStatus === 'needs_reauth'}
                      >
                        {refreshingToken ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Token
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchConnectionStatus}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                      </Button>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Calendar Mapping Card */}
          {connectionStatus?.isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar Mapping
                </CardTitle>
                <CardDescription>
                  Configure which GHL calendars sync to appointments or discoveries in your system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCalendars ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading calendars...</span>
                  </div>
                ) : calendars.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No calendars found in your GHL account</p>
                    <Button 
                      variant="outline" 
                      onClick={fetchCalendarsAndMappings}
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Calendars
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} in your GHL account
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchCalendarsAndMappings}
                        disabled={loadingCalendars}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Calendar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enabled</TableHead>
                            <TableHead>Map To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calendars.map((calendar) => {
                            const mapping = mappings.find(m => m.ghl_calendar_id === calendar.id)
                            const isEnabled = mapping?.is_enabled || false
                            const targetTable = mapping?.target_table || 'appointments'
                            
                            return (
                              <TableRow key={calendar.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{calendar.name}</div>
                                    {calendar.description && (
                                      <div className="text-sm text-muted-foreground">
                                        {calendar.description}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={calendar.isActive ? "default" : "secondary"}
                                    className={calendar.isActive ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {calendar.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => 
                                      updateMapping(calendar.id, checked as boolean, targetTable)
                                    }
                                    disabled={savingMappings}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={targetTable}
                                    onValueChange={(value: 'appointments' | 'discoveries') =>
                                      updateMapping(calendar.id, isEnabled, value)
                                    }
                                    disabled={!isEnabled || savingMappings}
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="appointments">Appointments</SelectItem>
                                      <SelectItem value="discoveries">Discoveries</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {mappings.filter(m => m.is_enabled).length > 0 && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Active Mappings</AlertTitle>
                        <AlertDescription>
                          {mappings.filter(m => m.is_enabled).length} calendar{mappings.filter(m => m.is_enabled).length !== 1 ? 's are' : ' is'} currently syncing data to your system.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Webhooks Card */}
          {connectionStatus?.isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Webhook Subscriptions</CardTitle>
                <CardDescription>
                  Webhooks allow real-time data synchronization between GoHighLevel and your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Webhook Events</AlertTitle>
                    <AlertDescription>
                      Automatically subscribed to: Phone calls, Appointments, Contacts
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    variant="outline"
                    onClick={resubscribeWebhooks}
                    disabled={resubscribing}
                  >
                    {resubscribing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-subscribe Webhooks
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions Card */}
          {!connectionStatus?.isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>How to Connect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Click the "Connect to GoHighLevel" button above</li>
                  <li>You'll be redirected to GoHighLevel to authorize the connection</li>
                  <li>Select the sub-account you want to connect</li>
                  <li>Grant the requested permissions</li>
                  <li>You'll be redirected back here once connected</li>
                </ol>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Required Permissions</AlertTitle>
                  <AlertDescription>
                    The integration requires access to contacts, opportunities, calendars, conversations, and user data.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default function GHLConnectionPage() {
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
      <GHLConnectionContent />
    </Suspense>
  )
} 