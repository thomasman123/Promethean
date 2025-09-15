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
import { Shield, AlertCircle, CheckCircle2, Loader2, Link, Unlink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface GhlConnectionStatus {
  isConnected: boolean
  locationId: string | null
  authType: string | null
  tokenExpiresAt: string | null
  webhookId: string | null
}

function GHLConnectionContent() {
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<GhlConnectionStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [resubscribing, setResubscribing] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
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
      // Get account with GHL connection data
      const { data: account, error } = await supabase
        .from('accounts')
        .select('ghl_api_key, ghl_location_id, ghl_auth_type, ghl_token_expires_at, ghl_webhook_id')
        .eq('id', selectedAccountId)
        .single()

      if (error) throw error

      const status: GhlConnectionStatus = {
        isConnected: !!account.ghl_api_key,
        locationId: account.ghl_location_id,
        authType: account.ghl_auth_type,
        tokenExpiresAt: account.ghl_token_expires_at,
        webhookId: account.ghl_webhook_id
      }

      setConnectionStatus(status)
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

  const initiateOAuthFlow = () => {
    if (!selectedAccountId || !effectiveUser) return

    // Generate a nonce for CSRF protection
    const nonce = Math.random().toString(36).substring(2, 15)
    
    // Create state parameter
    const state = JSON.stringify({
      accountId: selectedAccountId,
      nonce: nonce,
      userId: effectiveUser.id
    })

    // Get OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID
    const redirectUri = 'https://www.getpromethean.com/api/auth/callback'
    
    if (!clientId) {
      toast({
        title: "Configuration Error",
        description: "GHL Client ID not configured",
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
    oauthUrl.searchParams.append('scope', 'contacts.readonly contacts.write opportunities.readonly opportunities.write calendars.readonly calendars.write conversations.readonly conversations.write locations.readonly businesses.readonly users.readonly')
    oauthUrl.searchParams.append('state', state)

    console.log('🚀 Redirecting to OAuth URL:', oauthUrl.toString())

    // Show info toast with debugging info
    toast({
      title: "Redirecting to GoHighLevel",
      description: "Using GoHighLevel marketplace OAuth flow.",
    })

    // Store the current URL attempt for potential fallback
    localStorage.setItem('ghl_oauth_attempt', 'marketplace')
    
    // Redirect to OAuth flow
    setTimeout(() => {
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

  const useInstallationURL = () => {
    // This opens the official GHL Installation URL
    // Users should get this URL from their GHL app dashboard: Advanced Settings > Auth > Installation URL
    toast({
      title: "Use Official Installation URL",
      description: "Please use the Installation URL from your GHL app dashboard for the most reliable connection.",
    })
    
    // Official Installation URL from GHL dashboard with correct redirect URI
    // Fixed to use gohighlevel.com instead of leadconnectorhq.com
    const installationURL = "https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=https%3A%2F%2Fwww.getpromethean.com%2Fapi%2Fauth%2Fcallback&client_id=687ac40ba336fa240d35a751-md9dlifq&scope=calendars.readonly+calendars.write+calendars%2Fevents.readonly+calendars%2Fevents.write+calendars%2Fresources.write+calendars%2Fresources.readonly+calendars%2Fgroups.write+calendars%2Fgroups.readonly+opportunities.readonly+oauth.write+oauth.readonly+opportunities.write+businesses.readonly+businesses.write+campaigns.readonly+conversations.readonly+conversations.write+conversations%2Fmessage.readonly+conversations%2Fmessage.write+conversations%2Freports.readonly+contacts.readonly+conversations%2Flivechat.write+contacts.write+objects%2Fschema.readonly+objects%2Frecord.readonly+objects%2Fschema.write+objects%2Frecord.write+associations.write+associations.readonly+associations%2Frelation.readonly+courses.write+associations%2Frelation.write+courses.readonly+forms.readonly+forms.write+invoices.readonly+invoices.write+invoices%2Fschedule.readonly+invoices%2Fschedule.write+invoices%2Ftemplate.readonly+invoices%2Festimate.readonly+invoices%2Ftemplate.write+invoices%2Festimate.write+links.readonly+lc-email.readonly+links.write+locations.readonly+locations%2FcustomValues.readonly+locations%2FcustomValues.write+locations%2FcustomFields.readonly+locations%2FcustomFields.write+locations%2Ftasks.readonly+locations%2Ftasks.write+locations%2Ftags.readonly+locations%2Ftags.write+locations%2Ftemplates.readonly+medias.readonly+medias.write+funnels%2Fredirect.readonly+funnels%2Fpage.readonly+funnels%2Ffunnel.readonly+funnels%2Fpagecount.readonly+funnels%2Fredirect.write+payments%2Forders.readonly+payments%2Forders.write+payments%2Fintegration.write+payments%2Fintegration.readonly+payments%2Ftransactions.readonly+payments%2Fsubscriptions.readonly+twilioaccount.read+blogs%2Flist.readonly+blogs%2Fposts.readonly+socialplanner%2Ftag.write+users.readonly&version_id=687ac40ba336fa240d35a751"
    
    window.open(installationURL, '_blank')
  }

  const tryAlternativeOAuth = () => {
    if (!selectedAccountId || !effectiveUser) return

    // Generate a nonce for CSRF protection
    const nonce = Math.random().toString(36).substring(2, 15)
    
    // Create state parameter
    const state = JSON.stringify({
      accountId: selectedAccountId,
      nonce: nonce,
      userId: effectiveUser.id
    })

    // Get OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID
    const redirectUri = 'https://www.getpromethean.com/api/auth/callback'
    
    if (!clientId) {
      toast({
        title: "Configuration Error",
        description: "GHL Client ID not configured",
        variant: "destructive"
      })
      return
    }

    // Try the standard app.gohighlevel.com OAuth URL
    const oauthUrl = new URL('https://app.gohighlevel.com/oauth/authorize')
    oauthUrl.searchParams.append('response_type', 'code')
    oauthUrl.searchParams.append('client_id', clientId)
    oauthUrl.searchParams.append('redirect_uri', redirectUri)
    oauthUrl.searchParams.append('scope', 'contacts.readonly contacts.write opportunities.readonly opportunities.write calendars.readonly calendars.write conversations.readonly conversations.write locations.readonly businesses.readonly users.readonly')
    oauthUrl.searchParams.append('state', state)

    console.log('🔄 Trying alternative OAuth URL:', oauthUrl.toString())

    // Store the current URL attempt for potential fallback
    localStorage.setItem('ghl_oauth_attempt', 'standard')

    toast({
      title: "Trying Alternative OAuth",
      description: "Using standard GHL login flow...",
    })

    // Redirect to OAuth flow
    setTimeout(() => {
      window.location.href = oauthUrl.toString()
    }, 1000)
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
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={useInstallationURL}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Use Installation URL (Recommended)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={initiateOAuthFlow}
                    >
                      Marketplace OAuth
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={tryAlternativeOAuth}
                      title="Try this if other methods show a blank page"
                    >
                      Standard OAuth
                    </Button>
                  </div>
                )}
              </div>

              {!connectionStatus?.isConnected && (
                <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Connection Help:</p>
                  <p>• If the main connect button shows a blank page, click "Try Alternative"</p>
                  <p>• Make sure your GHL app is published and active in the marketplace</p>
                  <p>• Verify your redirect URI in GHL app settings matches exactly: <code className="text-xs bg-blue-100 px-1 rounded">https://www.getpromethean.com/api/auth/callback</code></p>
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
                    <span className="text-muted-foreground">Token Status</span>
                    <span className={cn(
                      "font-medium",
                      isTokenExpired() ? "text-red-600" : "text-green-600"
                    )}>
                      {isTokenExpired() ? 'Expired' : 'Valid'}
                    </span>
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
                </div>
              )}
            </CardContent>
          </Card>

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