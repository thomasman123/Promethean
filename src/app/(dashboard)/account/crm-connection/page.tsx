"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Clock, XCircle, AlertTriangle, Zap, ExternalLink, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/date-time-picker"

export default function CRMConnectionPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [connection, setConnection] = useState<any>(null)
  const [showUninstallDialog, setShowUninstallDialog] = useState(false)
  const [showWipeDialog, setShowWipeDialog] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillStart, setBackfillStart] = useState<string>("")
  const [backfillEnd, setBackfillEnd] = useState<string>("")
  const [rangeBackfilling, setRangeBackfilling] = useState(false)

  useEffect(() => {
    if (!selectedAccountId) return
    loadConnection()
  }, [selectedAccountId, accountChangeTimestamp])

  const loadConnection = async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ghl/calendars?accountId=${encodeURIComponent(selectedAccountId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      // Treat a successful calendars fetch as a valid connection
      setConnection({ ghl_auth_type: 'oauth2', ghl_api_key: 'present', ghl_location_id: json?.locationId || null })
    } catch (e) {
      console.warn('Failed to load connection', e)
      setConnection(null)
    } finally {
      setLoading(false)
    }
  }

  const initiateGHLConnection = async () => {
    if (!selectedAccountId) return
    setConnecting(true)
    try {
      const baseUrl = window.location.origin
      const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID
      const redirectUri = `${baseUrl}/api/auth/callback`
      const scope = 'locations.readonly calendars.readonly contacts.readonly'
      const nonce = Math.random().toString(36).substring(2, 15)
      const state = JSON.stringify({ accountId: selectedAccountId, nonce })
      
      const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id', clientId || '')
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('loginWindowOpenMode', 'self')
      
      window.location.href = authUrl.toString()
    } catch (e) {
      console.error('Failed to initiate connection', e)
      setConnecting(false)
    }
  }

  const cancelGHLConnection = () => setConnecting(false)

  const disconnectGHL = async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ghl/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowUninstallDialog(true)
      await loadConnection()
    } catch (e) {
      console.error('Failed to disconnect', e)
    } finally {
      setLoading(false)
    }
  }

  const wipeAccountData = async () => {
    const confirmEl = document.getElementById('confirm-delete') as HTMLInputElement
    if (!confirmEl || confirmEl.value !== 'DELETE') return
    if (!selectedAccountId) return
    setWiping(true)
    try {
      const res = await fetch('/api/admin/toggle-agency-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, isAgency: false })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowWipeDialog(false)
      await loadConnection()
    } catch (e) {
      console.error('Failed to wipe data', e)
    } finally {
      setWiping(false)
    }
  }

  const runBackfill = async () => {
    if (!selectedAccountId) return
    setBackfilling(true)
    try {
      const res = await fetch('/api/account/backfill-appointment-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, limit: 200 })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      
      const filledCount = json.filled?.length || 0
      const errorCount = json.errors?.length || 0
      
      if (filledCount > 0) {
        toast.success(`Backfill completed: ${filledCount} appointments filled`)
      } else if (errorCount > 0) {
        toast.warning(`Backfill completed with ${errorCount} errors - no appointments filled`)
      } else {
        toast.info('Backfill completed - no appointments needed filling')
      }
    } catch (e: any) {
      toast.error(`Backfill failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setBackfilling(false)
    }
  }

  const runRangeBackfill = async () => {
    if (!selectedAccountId || !backfillStart || !backfillEnd) return
    setRangeBackfilling(true)
    try {
      const res = await fetch('/api/ghl/appointments/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, startIso: backfillStart, endIso: backfillEnd })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      toast.success(`Processed ${json.processed}, created ${json.created}`)
    } catch (e: any) {
      toast.error(`Backfill failed: ${e?.message || 'Unknown error'}`)
    } finally {
      setRangeBackfilling(false)
    }
  }

  async function syncContacts() {
		try {
			const res = await fetch('/api/ghl/contacts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accountId: selectedAccountId }),
			})
			const data = await res.json()
			// eslint-disable-next-line no-alert
			alert(res.ok ? `Synced ${data.insertedOrUpdated} contacts` : `Failed: ${data.error}`)
		} catch (e: any) {
			// eslint-disable-next-line no-alert
			alert(e?.message || 'Error')
		}
	}

  if (!permissions.canManageAccount) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage CRM connections.</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: 'connected' | 'connecting' | 'error' | 'disconnected') => {
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
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Connection</h1>
          <p className="text-muted-foreground">
            Connect your GoHighLevel account to sync leads, opportunities, and automate workflows
          </p>
        </div>

        <div className="p-3 border rounded-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Backfill Appointment Users</div>
              <div className="text-sm text-muted-foreground">Fill missing setter/rep IDs by matching emails/names to app users and granting access if needed.</div>
            </div>
            <Button variant="outline" onClick={runBackfill} disabled={backfilling || !(connection && connection.ghl_auth_type === 'oauth2' && connection.ghl_api_key)}>
              {backfilling ? 'Running...' : 'Run Backfill'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2 space-y-2">
              <Label>Start</Label>
              <DateTimePicker value={backfillStart || null} onChange={(iso) => setBackfillStart(iso || "")} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>End</Label>
              <DateTimePicker value={backfillEnd || null} onChange={(iso) => setBackfillEnd(iso || "")} />
            </div>
            <div className="sm:col-span-1">
              <Button onClick={runRangeBackfill} disabled={rangeBackfilling || !backfillStart || !backfillEnd || !(connection && connection.ghl_auth_type === 'oauth2' && connection.ghl_api_key)} className="w-full">
                {rangeBackfilling ? 'Syncing…' : 'Sync range'}
              </Button>
            </div>
            {!(connection && connection.ghl_auth_type === 'oauth2' && connection.ghl_api_key) && (
              <div className="sm:col-span-5 text-xs text-muted-foreground">
                Connect to GoHighLevel first to enable backfill.
              </div>
            )}
            <div className="sm:col-span-5 text-xs text-muted-foreground">
              Uses your calendar mappings, fetches from GHL API for the range, and saves appointments/discoveries with the same linking/user/contact logic as live webhooks.
            </div>
          </div>
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
                  {connection && (() => {
                    const isConnected = connection.ghl_auth_type === 'oauth2' && connection.ghl_api_key;
                    console.log('🔍 Status check:', {
                      ghl_auth_type: connection.ghl_auth_type,
                      has_ghl_api_key: !!connection.ghl_api_key,
                      isConnected,
                      statusWillBe: isConnected ? 'connected' : 'disconnected'
                    });
                    return getStatusBadge(isConnected ? 'connected' : 'disconnected');
                  })()}
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
                  {(() => {
                    const isConnected = connection?.ghl_auth_type === 'oauth2' && connection?.ghl_api_key;
                    console.log('🔘 Button logic:', {
                      ghl_auth_type: connection?.ghl_auth_type,
                      has_ghl_api_key: !!connection?.ghl_api_key,
                      isConnected,
                      showConnectButton: !isConnected
                    });
                    return !isConnected;
                  })() ? (
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
                      <Button variant="destructive" onClick={() => setShowWipeDialog(true)} disabled={wiping}>
                        {wiping ? 'Wiping…' : 'Wipe Data'}
                      </Button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={disconnectGHL}
                        disabled={loading}
                      >
                        {loading ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                      <Button variant="destructive" onClick={() => setShowWipeDialog(true)} disabled={wiping}>
                        {wiping ? 'Wiping…' : 'Wipe Data'}
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
            <div className="flex gap-2">
				<Button onClick={syncContacts}>Sync Contacts</Button>
			</div>
          </div>
        )}
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

      <Dialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Wipe Account Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all appointments, discoveries, dials, payments, and webhook logs for this account. Users and the GHL connection will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Type DELETE to confirm:</p>
            <input id="confirm-delete" className="w-full border rounded px-3 py-2 bg-background" onChange={(e)=>{(e.target as HTMLInputElement).dataset.ok = (e.target as HTMLInputElement).value === 'DELETE' ? '1':'0'}} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWipeDialog(false)}>Cancel</Button>
            <Button onClick={wipeAccountData} disabled={wiping}>Confirm Wipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 