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
import { Shield, AlertCircle, CheckCircle2, Loader2, Link, Unlink, RefreshCw, TrendingUp, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Loading } from "@/components/ui/loading"

interface MetaAdsConnectionStatus {
  isConnected: boolean
  metaUserId: string | null
  authType: string | null
  tokenExpiresAt: string | null
  tokenHealthStatus?: 'healthy' | 'warning' | 'expired' | 'needs_reauth'
  tokenLastRefreshed?: string | null
}

interface MetaAdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
  is_mapped?: boolean
}

interface AdAccountMapping {
  id: string
  account_id: string
  meta_ad_account_id: string
  meta_ad_account_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function MetaAdsConnectionContent() {
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<MetaAdsConnectionStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  
  // Ad accounts state
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([])
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false)
  const [refreshingToken, setRefreshingToken] = useState(false)
  const [mappings, setMappings] = useState<AdAccountMapping[]>([])
  const [savingMappings, setSavingMappings] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
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

    if (success === 'true') {
      toast({
        title: "Success",
        description: "Meta Ads connected successfully"
      })
      // Clean up URL
      router.replace('/account/meta-ads-connection')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'missing_parameters': 'Missing required OAuth parameters',
        'missing_account_info': 'Could not determine which account to connect (state parameter missing)',
        'stale_oauth_session': 'OAuth session expired - please try connecting again',
        'invalid_state': 'Invalid OAuth state parameter',
        'configuration_error': 'Meta Ads client configuration error',
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
      router.replace('/account/meta-ads-connection')
    } else if (warning === 'partial_success') {
      toast({
        title: "Partial Success",
        description: "Connected to Meta Ads but some features may not be available",
        variant: "destructive"
      })
      // Clean up URL
      router.replace('/account/meta-ads-connection')
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
      // Get account with Meta Ads connection data including token health
      const { data: account, error } = await supabase
        .from('accounts')
        .select('meta_access_token, meta_user_id, meta_auth_type, meta_token_expires_at, meta_token_health_status, meta_token_last_refreshed')
        .eq('id', selectedAccountId)
        .single()

      if (error) throw error

      const status: MetaAdsConnectionStatus = {
        isConnected: !!account.meta_access_token,
        metaUserId: account.meta_user_id,
        authType: account.meta_auth_type,
        tokenExpiresAt: account.meta_token_expires_at,
        tokenHealthStatus: account.meta_token_health_status,
        tokenLastRefreshed: account.meta_token_last_refreshed
      }

      setConnectionStatus(status)
      
      // If connected, also fetch ad accounts
      if (status.isConnected) {
        await fetchAdAccounts()
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

  const fetchAdAccountMappings = async () => {
    if (!selectedAccountId) return
    
    try {
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('meta_ad_account_name')
      
      if (mappingsError) {
        console.error('Error fetching ad account mappings:', mappingsError)
        setMappings([])
      } else {
        setMappings(mappingsData || [])
      }
    } catch (error) {
      console.error('Error fetching ad account mappings:', error)
    }
  }

  const fetchAdAccounts = async () => {
    if (!selectedAccountId) return
    
    setLoadingAdAccounts(true)
    try {
      // Fetch ad accounts from Meta Ads API
      const adAccountsResponse = await fetch(`/api/meta-ads/ad-accounts?accountId=${selectedAccountId}`)
      const adAccountsData = await adAccountsResponse.json()
      
      if (adAccountsData.success) {
        setAdAccounts(adAccountsData.adAccounts || [])
        
        // Also fetch existing mappings for this account
        await fetchAdAccountMappings()
      } else {
        console.error('Failed to fetch ad accounts:', adAccountsData.error)
        setAdAccounts([])
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load ad accounts",
        variant: "destructive"
      })
    } finally {
      setLoadingAdAccounts(false)
    }
  }

  const updateAdAccountMapping = async (adAccount: MetaAdAccount, enabled: boolean) => {
    if (!selectedAccountId) return
    
    setSavingMappings(true)
    try {
      const existingMapping = mappings.find(m => m.meta_ad_account_id === adAccount.id)
      
      if (existingMapping) {
        // Update existing mapping
        const { error } = await supabase
          .from('meta_ad_accounts')
          .update({
            is_active: enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMapping.id)
        
        if (error) throw error
        
        // Update local state
        setMappings(prev => prev.map(m => 
          m.id === existingMapping.id 
            ? { ...m, is_active: enabled, updated_at: new Date().toISOString() }
            : m
        ))
      } else if (enabled) {
        // Create new mapping
        const newMapping = {
          account_id: selectedAccountId,
          meta_ad_account_id: adAccount.id,
          meta_ad_account_name: adAccount.name,
          is_active: enabled
        }
        
        const { data, error } = await supabase
          .from('meta_ad_accounts')
          .insert(newMapping)
          .select()
          .single()
        
        if (error) throw error
        
        // Add to local state
        setMappings(prev => [...prev, data])
      }
      
      toast({
        title: "Success",
        description: `Ad account ${enabled ? 'connected' : 'disconnected'} for ${adAccount.name}`,
      })
    } catch (error) {
      console.error('Error updating ad account mapping:', error)
      toast({
        title: "Error",
        description: "Failed to update ad account mapping",
        variant: "destructive"
      })
    } finally {
      setSavingMappings(false)
    }
  }

  const syncMetaAdsData = async () => {
    if (!selectedAccountId) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/meta-ads/sync-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Quick sync completed! ${data.campaignsSynced || 0} campaigns, ${data.adSetsSynced || 0} ad sets, ${data.adsSynced || 0} ads + ${data.insightsSynced || 0} metrics (${data.apiCallsUsed || 1} API call)`,
        })
      } else {
        throw new Error(data.error || 'Failed to sync data')
      }
    } catch (error) {
      console.error('Meta Ads sync error:', error)
      toast({
        title: "Error",
        description: "Failed to sync Meta Ads data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  const syncCustomRange = async (days: number) => {
    if (!selectedAccountId) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/meta-ads/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: selectedAccountId,
          daysBack: days,
          syncType: 'full'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `${days}-day sync completed! Synced ${data.campaignsSynced || 0} campaigns and ${data.insightsSynced || 0} insights`,
        })
      } else {
        throw new Error(data.error || 'Failed to sync data')
      }
    } catch (error) {
      console.error('Meta Ads custom sync error:', error)
      toast({
        title: "Error",
        description: `Failed to sync ${days} days of data. Please try again.`,
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  const manualRefreshToken = async () => {
    if (!selectedAccountId) return
    
    setRefreshingToken(true)
    try {
      const response = await fetch('/api/meta-ads/refresh-tokens', {
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
    console.log('🔍 Meta Ads OAuth Flow Initiation - Current State:', {
      selectedAccountId,
      effectiveUser: !!effectiveUser,
      effectiveUserId: effectiveUser?.id,
      userLoading,
      loading,
      hasAccess
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
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || `${window.location.origin}/api/auth/meta-callback`
    
    console.log('🔍 Meta Ads OAuth initiation details:', {
      selectedAccountId,
      effectiveUserId: userId,
      clientId,
      redirectUri,
      origin: window.location.origin,
      stateObject: { accountId: selectedAccountId, nonce, userId: userId },
      stateString: state
    })
    
    if (!clientId) {
      console.error('❌ Missing Meta App ID')
      toast({
        title: "Configuration Error",
        description: "Meta App ID not configured",
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
    console.log('🔍 Meta Ads OAuth Configuration:', {
      clientId,
      redirectUri,
      origin: window.location.origin,
      state: JSON.parse(state)
    })

    // Construct OAuth URL for Meta Ads
    const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    oauthUrl.searchParams.append('client_id', clientId)
    oauthUrl.searchParams.append('redirect_uri', redirectUri)
    oauthUrl.searchParams.append('response_type', 'code')
    // Meta Ads specific scopes for business functionality
    oauthUrl.searchParams.append('scope', 'ads_read,ads_management,read_insights,business_management,pages_read_engagement,pages_show_list')
    oauthUrl.searchParams.append('state', state)

    console.log('🚀 FINAL META ADS OAUTH URL:', oauthUrl.toString())
    console.log('🔍 URL Components:', {
      base: oauthUrl.origin + oauthUrl.pathname,
      params: Object.fromEntries(oauthUrl.searchParams.entries())
    })

    // Show info toast with debugging info
    toast({
      title: "Redirecting to Meta Ads",
      description: "Using Meta Facebook OAuth flow.",
    })

    // Store the current URL attempt for potential fallback
    localStorage.setItem('meta_oauth_attempt', 'facebook')
    
    // Redirect to OAuth flow
    console.log('⏳ Redirecting in 1 second...')
    setTimeout(() => {
      console.log('🔄 Redirecting now to:', oauthUrl.toString())
      window.location.href = oauthUrl.toString()
    }, 1000)
  }

  const disconnectMetaAds = async () => {
    if (!selectedAccountId) return

    setDisconnecting(true)
    try {
      const response = await fetch('/api/admin/meta-ads/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      toast({
        title: "Success",
        description: "Meta Ads connection removed"
      })

      // Refresh status
      await fetchConnectionStatus()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Meta Ads",
        variant: "destructive"
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const isTokenExpired = () => {
    if (!connectionStatus?.tokenExpiresAt) return false
    return new Date(connectionStatus.tokenExpiresAt) <= new Date()
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="pt-16 p-6">
          <Loading text="Loading Meta Ads connection..." />
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
                Only account moderators can manage Meta Ads connections.
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
                Please select an account from the dropdown to manage its Meta Ads connection.
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Meta Ads Connection</h1>
            <p className="text-muted-foreground mt-2">
              Connect your account to Meta Ads to sync campaign data and track advertising performance.
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
                    onClick={disconnectMetaAds}
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
                        Connect Meta Ads
                      </>
                    )}
                  </Button>
                )}
              </div>

              {!connectionStatus?.isConnected && (
                <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Connection Help:</p>
                  <p>• Make sure your Meta Ads app is configured and active</p>
                  <p>• Verify your redirect URI in Meta app settings matches exactly: <code className="text-xs bg-blue-100 px-1 rounded">https://www.getpromethean.com/api/auth/meta-callback</code></p>
                  <p>• Ensure you have the necessary permissions in your Meta account</p>
                  <p>• Your business may need to be verified for advanced Meta Ads features</p>
                </div>
              )}

              {connectionStatus?.isConnected && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono">{connectionStatus.metaUserId || 'Not set'}</span>
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
                            ? 'Your Meta Ads token has expired. Try refreshing it or reconnect if needed.'
                            : 'Your Meta Ads token will expire within 7 days. It will be automatically refreshed, but you can manually refresh it now.'
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {connectionStatus.tokenHealthStatus === 'needs_reauth' && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle>Re-authentication Required</AlertTitle>
                        <AlertDescription>
                          Your Meta Ads connection needs to be re-established. Please disconnect and reconnect your account.
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

          {/* Ad Accounts Card */}
          {connectionStatus?.isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ad Accounts
                </CardTitle>
                <CardDescription>
                  View and manage your Meta Ad Accounts connected to this integration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAdAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading ad accounts...</span>
                  </div>
                ) : adAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No ad accounts found in your Meta Ads account</p>
                    <Button 
                      variant="outline" 
                      onClick={fetchAdAccounts}
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Ad Accounts
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found {adAccounts.length} ad account{adAccounts.length !== 1 ? 's' : ''} in your Meta Ads account
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchAdAccounts}
                        disabled={loadingAdAccounts}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Account ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead>Timezone</TableHead>
                            <TableHead>Use for This Client</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adAccounts.map((account) => {
                            const isMapping = mappings.find(m => m.meta_ad_account_id === account.id)
                            const isMapped = !!isMapping && isMapping.is_active
                            
                            return (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <div className="font-medium">{account.name}</div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                    {account.id}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={account.account_status === 1 ? "default" : "secondary"}
                                    className={account.account_status === 1 ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {account.account_status === 1 ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{account.currency}</TableCell>
                                <TableCell>{account.timezone_name}</TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={isMapped}
                                    onCheckedChange={(checked: boolean) => 
                                      updateAdAccountMapping(account, checked)
                                    }
                                    disabled={savingMappings || account.account_status !== 1}
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {adAccounts.filter(a => a.account_status === 1).length > 0 && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Active Ad Accounts</AlertTitle>
                        <AlertDescription>
                          {adAccounts.filter(a => a.account_status === 1).length} ad account{adAccounts.filter(a => a.account_status === 1).length !== 1 ? 's are' : ' is'} currently active and ready for data sync.
                        </AlertDescription>
                      </Alert>
                    )}

                    {mappings.filter(m => m.is_active).length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">Data Synchronization</h4>
                            <p className="text-sm text-muted-foreground">
                              Sync campaign data and performance metrics from your selected ad accounts. Use daily sync to minimize API usage.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={syncMetaAdsData}
                              disabled={syncing}
                              variant="outline"
                              size="sm"
                            >
                              {syncing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                                                             {syncing ? 'Syncing...' : 'Quick Sync (All Data + Metrics)'}
                             </Button>
                            
                            <Button
                              onClick={() => syncCustomRange(7)}
                              disabled={syncing}
                              variant="outline"
                              size="sm"
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Sync 7 Days
                            </Button>
                            
                            <Button
                              onClick={() => syncCustomRange(30)}
                              disabled={syncing}
                              variant="outline"
                              size="sm"
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Sync 30 Days
                            </Button>
                          </div>
                          
                          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="font-medium text-blue-900 mb-1">⚡ Ultra-Fast Batched Sync with ALL Metrics:</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-800">
                              <li><strong>Quick Sync:</strong> ALL campaigns, ad sets, ads + today's performance metrics (1 API call!)</li>
                              <li><strong>Includes:</strong> Impressions, clicks, spend, reach, CTR, CPC, CPM, frequency, actions</li>
                              <li><strong>7-Day Sync:</strong> Same as Quick + 7 days of historical insights</li>
                              <li><strong>30-Day Sync:</strong> Complete historical analysis with all metrics</li>
                              <li><strong>Zero Rate Limits:</strong> Batched requests are API-friendly</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <li>Click the "Connect Meta Ads" button above</li>
                  <li>You'll be redirected to Meta (Facebook) to authorize the connection</li>
                  <li>Select the business account and ad accounts you want to connect</li>
                  <li>Grant the requested permissions for ad management and insights</li>
                  <li>You'll be redirected back here once connected</li>
                </ol>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Required Permissions</AlertTitle>
                  <AlertDescription>
                    The integration requires access to ads management, insights, business management, and pages data.
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

export default function MetaAdsConnectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <TopBar />
        <main className="pt-16 p-6">
          <Loading text="Loading..." />
        </main>
      </div>
    }>
      <MetaAdsConnectionContent />
    </Suspense>
  )
} 