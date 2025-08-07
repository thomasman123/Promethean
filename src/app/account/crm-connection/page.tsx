"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Zap, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react"

interface GHLConnection {
  id: string
  account_id: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  ghl_location_id: string | null
  ghl_company_id: string | null
  is_connected: boolean
  connection_status: 'disconnected' | 'connecting' | 'connected' | 'error'
  last_sync_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export default function CRMConnectionPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [connection, setConnection] = useState<GHLConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (selectedAccountId) {
      fetchConnection()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, accountChangeTimestamp])

  useEffect(() => {
    // Handle OAuth callback results
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')

    if (success === 'true') {
      // OAuth success - refresh connection status
      fetchConnection()
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error) {
      // Handle OAuth errors - just log, don't throw
      console.warn('OAuth error:', error)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchConnection = async () => {
    if (!selectedAccountId) return

    try {
      const { data, error } = await supabase
        .from('ghl_connections')
        .select('*')
        .eq('account_id', selectedAccountId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching GHL connection:', error)
      } else {
        setConnection(data)
      }
    } catch (error) {
      console.error('Error fetching GHL connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const initiateGHLConnection = async () => {
    if (!selectedAccountId) return

    setConnecting(true)

    try {
      // First, create or update the connection record with 'connecting' status
      const { data: existingConnection } = await supabase
        .from('ghl_connections')
        .select('*')
        .eq('account_id', selectedAccountId)
        .single()

      if (existingConnection) {
        // Update existing connection
        await supabase
          .from('ghl_connections')
          .update({
            connection_status: 'connecting',
            error_message: null
          })
          .eq('account_id', selectedAccountId)
      } else {
        // Create new connection record
        await supabase
          .from('ghl_connections')
          .insert({
            account_id: selectedAccountId,
            connection_status: 'connecting'
          })
      }

      // Refresh the connection state
      await fetchConnection()

      // Build the OAuth URL with proper scopes for GHL marketplace app
      const ghlClientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID || 'your-ghl-client-id'
      const redirectUri = `${window.location.origin}/api/auth/callback`
      
             // Use comprehensive scopes - these can be managed in the GHL marketplace app settings
       const scopes = [
         'contacts.readonly', 'contacts.write',
         'opportunities.readonly', 'opportunities.write', 
         'calendars.readonly', 'calendars.write',
         'conversations.readonly', 'conversations.write',
         'locations.readonly',
         'businesses.readonly',
         'users.readonly'
       ].join(' ')
      
      // Add state parameter to track the account this connection is for
      const state = selectedAccountId
      
      const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${ghlClientId}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`
      
      // Redirect to GHL OAuth
      window.location.href = authUrl

    } catch (error) {
      console.error('Error initiating GHL connection:', error)
      
      // Update connection status to error
      if (selectedAccountId) {
        await supabase
          .from('ghl_connections')
          .update({
            connection_status: 'error',
            error_message: 'Failed to initiate connection'
          })
          .eq('account_id', selectedAccountId)
        
        await fetchConnection()
      }
    } finally {
      setConnecting(false)
    }
  }

  const disconnectGHL = async () => {
    if (!selectedAccountId || !connection) return

    try {
      await supabase
        .from('ghl_connections')
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          ghl_location_id: null,
          ghl_company_id: null,
          is_connected: false,
          connection_status: 'disconnected',
          error_message: null
        })
        .eq('account_id', selectedAccountId)

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

  if (!permissions.canManageAccount) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground">
                You don&apos;t have permission to manage CRM connections.
              </p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                      {connection && getStatusBadge(connection.connection_status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {connection?.error_message && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{connection.error_message}</AlertDescription>
                      </Alert>
                    )}

                    {connection?.is_connected && connection.ghl_location_id && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <h4 className="font-medium">Connection Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Location ID:</span>
                            <span className="ml-2 font-mono">{connection.ghl_location_id}</span>
                          </div>
                          {connection.ghl_company_id && (
                            <div>
                              <span className="text-muted-foreground">Company ID:</span>
                              <span className="ml-2 font-mono">{connection.ghl_company_id}</span>
                            </div>
                          )}
                          {connection.last_sync_at && (
                            <div>
                              <span className="text-muted-foreground">Last Sync:</span>
                              <span className="ml-2">{new Date(connection.last_sync_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!connection?.is_connected ? (
                        <Button
                          onClick={initiateGHLConnection}
                          disabled={connecting || connection?.connection_status === 'connecting'}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {connecting || connection?.connection_status === 'connecting' ? (
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
      </SidebarInset>
    </SidebarProvider>
  )
} 