"use client"

import { useState, useEffect, useCallback } from "react"
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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Zap, CheckCircle, XCircle, Clock, AlertCircle, AlertTriangle, ExternalLink } from "lucide-react"

interface GHLConnection {
  id: string
  name: string
  ghl_api_key: string | null
  ghl_refresh_token: string | null
  ghl_token_expires_at: string | null
  ghl_location_id: string | null
  ghl_auth_type: 'api_key' | 'oauth2' | null
  ghl_webhook_id: string | null
  future_sync_enabled: boolean
  future_sync_started_at: string | null
  last_future_sync_at: string | null
  created_at: string
}

export default function CRMConnectionPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [connection, setConnection] = useState<GHLConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showUninstallDialog, setShowUninstallDialog] = useState(false)

  useEffect(() => {
    if (selectedAccountId) {
      fetchConnection()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, accountChangeTimestamp])

  useEffect(() => {
    // Handle OAuth callback results
    const url = new URL(window.location.href)
    const success = url.searchParams.get('success')
    const error = url.searchParams.get('error')

    const cleanupUrl = () => window.history.replaceState({}, '', window.location.pathname)

    const applyError = async (message: string) => {
      try {
        if (!selectedAccountId) return
        await supabase
          .from('ghl_connections')
          .update({ connection_status: 'error', error_message: message })
          .eq('account_id', selectedAccountId)
      } catch {}
      await fetchConnection()
    }

    if (success === 'true') {
      // OAuth success - refresh connection status
      fetchConnection()
      cleanupUrl()
    } else if (error) {
      // Persist error status so UI leaves "connecting" state
      applyError(decodeURIComponent(error))
      cleanupUrl()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh connection when account changes
  useEffect(() => {
    if (!selectedAccountId) return
    if (connecting) {
      const interval = setInterval(() => {
        fetchConnection()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [connecting, selectedAccountId])

  const fetchConnection = async () => {
    if (!selectedAccountId) return

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', selectedAccountId)
        .single()

      if (error) {
        console.error('Error fetching account:', error)
      } else {
        setConnection(data)
      }
    } catch (error) {
      console.error('Error fetching account:', error)
    } finally {
      setLoading(false)
    }
  }

  const initiateGHLConnection = async () => {
    if (!selectedAccountId) return

    setConnecting(true)

    try {
      // Build the OAuth URL with proper scopes for GHL marketplace app
      const ghlClientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID || 'your-ghl-client-id'
      const redirectUri = `${window.location.origin}/api/auth/callback`
      const scopes = [
        'contacts.readonly', 'contacts.write',
        'opportunities.readonly', 'opportunities.write', 
        'calendars.readonly', 'calendars.write',
        'calendars/events.readonly', 'calendars/events.write',
        'conversations.readonly', 'conversations.write',
        'conversations/message.readonly',
        'locations.readonly',
        'businesses.readonly',
        'users.readonly'
      ].join(' ')
      const state = selectedAccountId
      const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${ghlClientId}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`
      
      // Redirect to GHL OAuth
      window.location.href = authUrl

    } catch (error) {
      console.error('Error initiating GHL connection:', error)
    } finally {
      setConnecting(false)
    }
  }

  const cancelGHLConnection = async () => {
    if (!selectedAccountId) return
    setConnecting(false)
  }

  const disconnectGHL = async () => {
    if (!selectedAccountId || !connection) return

    try {
      // Call server-side cleanup to remove mappings and reset connection
      const { error: rpcError } = await supabase.rpc('admin_clean_account_ghl_data', {
        target_account_id: selectedAccountId,
      })

      if (rpcError) {
        console.error('Cleanup RPC failed, falling back to local update:', rpcError)
        await supabase
          .from('accounts')
          .update({
            ghl_api_key: null,
            ghl_refresh_token: null,
            ghl_token_expires_at: null,
            ghl_location_id: null,
            ghl_auth_type: 'api_key',
            ghl_webhook_id: null,
            future_sync_enabled: false
          })
          .eq('id', selectedAccountId)
        // Also try to delete mappings client-side if possible
        await supabase
          .from('calendar_mappings')
          .delete()
          .eq('account_id', selectedAccountId)
      }

      setShowUninstallDialog(false)
      await fetchConnection()
    } catch (error) {
      console.error('Error disconnecting GHL:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
      case 'connecting':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Connecting...</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>
    }
  }

  
  return (
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
                <BreadcrumbPage>CRM Connection</BreadcrumbPage>
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
              <h1 className="text-3xl font-bold tracking-tight">CRM Connection</h1>
              <p className="text-muted-foreground">
                Connect your GoHighLevel account to sync leads, opportunities, and automate workflows
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading connection status...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* GoHighLevel Connection Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                          <Zap className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle>GoHighLevel</CardTitle>
                          <CardDescription>
                            All-in-one marketing & CRM platform
                          </CardDescription>
                        </div>
                      </div>
                      {connection && getStatusBadge(connection.ghl_auth_type === 'oauth2' && connection.ghl_api_key ? 'connected' : 'disconnected')}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {connection?.ghl_auth_type === 'oauth2' && connection.ghl_location_id && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <h4 className="font-medium">Connection Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Location ID:</span>
                            <span className="ml-2 font-mono">{connection.ghl_location_id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Auth Type:</span>
                            <span className="ml-2">OAuth 2.0</span>
                          </div>
                          {connection.ghl_webhook_id && (
                            <div>
                              <span className="text-muted-foreground">Webhook ID:</span>
                              <span className="ml-2 font-mono">{connection.ghl_webhook_id}</span>
                            </div>
                          )}
                          {connection.last_future_sync_at && (
                            <div>
                              <span className="text-muted-foreground">Last Sync:</span>
                              <span className="ml-2">{new Date(connection.last_future_sync_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      {!(connection?.ghl_auth_type === 'oauth2' && connection?.ghl_api_key) ? (
                        <>
                          <Button
                            onClick={initiateGHLConnection}
                            disabled={connecting}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {connecting ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Connect to GoHighLevel
                              </>
                            )}
                          </Button>
                          {connecting && (
                            <Button variant="outline" onClick={cancelGHLConnection}>
                              Cancel
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={disconnectGHL}>
                            Disconnect
                          </Button>
                          <Button variant="outline" asChild>
                            <a
                              href="https://app.gohighlevel.com"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open GoHighLevel
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>What you can do with GoHighLevel:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Sync contacts and leads automatically</li>
                        <li>Create and manage opportunities</li>
                        <li>Track appointments and calendar events</li>
                        <li>Access all conversation and messaging data</li>
                        <li>Manage forms and capture leads</li>
                        <li>Access comprehensive CRM data</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>About GoHighLevel Integration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This integration connects through GoHighLevel&apos;s marketplace app system, providing access to all scopes and webhooks available through their v2 API.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You can manage specific permissions and scopes directly in your GoHighLevel marketplace app settings rather than in this interface.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-4 h-4" />
                      <a
                        href="https://marketplace.gohighlevel.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        GoHighLevel Marketplace
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

             {/* Enhanced Disconnect Confirmation Dialog */}
      <Dialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Complete Data Cleanup & Disconnection
            </DialogTitle>
            <DialogDescription>
              All account data has been permanently removed from this system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <strong>Data Deleted:</strong> All appointments, discoveries, dials, calendar mappings, and webhook logs for this account have been permanently removed.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">To complete the disconnection:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Go to your GHL sub-account dashboard</li>
                <li>Navigate to Settings → Integrations/Apps</li>
                <li>Find the Promethean app and uninstall it</li>
                <li>This ensures clean reconnection in the future</li>
              </ol>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Manual GHL app removal prevents webhook conflicts when reconnecting with fresh data.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUninstallDialog(false)} className="bg-red-600 hover:bg-red-700 text-white">
              Understood - Data Deleted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  )
} 