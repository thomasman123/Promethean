"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Database, Loader2, CheckCircle, AlertCircle, RefreshCw, Download, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ContactStats {
  totalContacts: number
  withGhlCreated: number
  needBackfill: number
}

interface ContactSyncToolsProps {
  accountId: string
}

export function ContactSyncTools({ accountId }: ContactSyncToolsProps) {
  const [isBackfillLoading, setIsBackfillLoading] = useState(false)
  const [isSyncLoading, setIsSyncLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [contactStats, setContactStats] = useState<ContactStats | null>(null)
  const { toast } = useToast()

  // Load contact stats on mount and when account changes
  useEffect(() => {
    if (accountId) {
      loadContactStats()
    }
  }, [accountId])

  const loadContactStats = async () => {
    if (!accountId) return
    
    try {
      const response = await fetch('/api/admin/trigger-contact-backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          checkOnly: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setContactStats({
          totalContacts: result.totalContacts || 0,
          withGhlCreated: result.withGhlCreatedAt || 0,
          needBackfill: (result.totalContacts || 0) - (result.withGhlCreatedAt || 0)
        })
      }
    } catch (error) {
      console.error('❌ Error loading contact stats:', error)
    }
  }

  const handleBackfillDates = async () => {
    setIsBackfillLoading(true)
    setBackfillResult(null)
    
    try {
      console.log('🔄 Starting full contact sync from GHL (backfill + new contacts)...')
      
      const response = await fetch('/api/admin/sync-all-contacts-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventMatch = line.match(/event: (\w+)/)
            const dataMatch = line.match(/data: (.+)/)
            
            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1]
              const data = JSON.parse(dataMatch[1])

              console.log(`📡 Backfill SSE ${eventType}:`, data)

              if (eventType === 'progress') {
                setBackfillResult({
                  inProgress: true,
                  stage: data.stage,
                  message: data.message,
                  syncedCount: data.syncedCount || 0,
                  totalEstimate: data.totalEstimate || 0,
                  progress: data.progress || 0,
                  batchNumber: data.batchNumber,
                })
              } else if (eventType === 'complete') {
                setBackfillResult({
                  success: true,
                  totalProcessed: data.syncedCount,
                  message: data.message,
                  progress: 100,
                })
                toast({
                  title: "Contact sync completed",
                  description: data.message,
                })
                await loadContactStats()
              } else if (eventType === 'error') {
                setBackfillResult({
                  success: false,
                  error: data.error,
                })
                toast({
                  title: "Contact sync failed",
                  description: data.error || 'Unknown error',
                  variant: "destructive"
                })
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Contact sync error:', error)
      toast({
        title: "Sync error",
        description: "Failed to start contact sync process",
        variant: "destructive"
      })
      setBackfillResult({
        success: false,
        error: 'Failed to start sync process'
      })
    } finally {
      setIsBackfillLoading(false)
    }
  }

  const handleFullContactSync = async () => {
    setIsSyncLoading(true)
    setSyncResult(null)
    
    try {
      console.log('🔄 Starting full contact sync from GHL...')
      
      const response = await fetch('/api/admin/sync-all-contacts-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventMatch = line.match(/event: (\w+)/)
            const dataMatch = line.match(/data: (.+)/)
            
            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1]
              const data = JSON.parse(dataMatch[1])

              console.log(`📡 SSE ${eventType}:`, data)

              if (eventType === 'progress') {
                setSyncResult({
                  inProgress: true,
                  stage: data.stage,
                  message: data.message,
                  syncedCount: data.syncedCount || 0,
                  totalEstimate: data.totalEstimate || 0,
                  progress: data.progress || 0,
                  batchNumber: data.batchNumber,
                })
              } else if (eventType === 'complete') {
                setSyncResult({
                  success: true,
                  syncedCount: data.syncedCount,
                  message: data.message,
                  progress: 100,
                })
                toast({
                  title: "Contact sync completed",
                  description: data.message,
                })
                await loadContactStats()
              } else if (eventType === 'error') {
                setSyncResult({
                  success: false,
                  error: data.error,
                })
                toast({
                  title: "Contact sync failed",
                  description: data.error || 'Unknown error',
                  variant: "destructive"
                })
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Contact sync error:', error)
      toast({
        title: "Sync error",
        description: "Failed to start contact sync process",
        variant: "destructive"
      })
      setSyncResult({
        success: false,
        error: 'Failed to start sync process'
      })
    } finally {
      setIsSyncLoading(false)
    }
  }

  const needsBackfill = contactStats && contactStats.needBackfill > 0
  const isComplete = contactStats && contactStats.needBackfill === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Contact Sync Tools
        </CardTitle>
        <CardDescription>
          Manage contact synchronization with GoHighLevel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Contact Stats */}
        {contactStats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{contactStats.totalContacts}</div>
              <div className="text-xs text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{contactStats.withGhlCreated}</div>
              <div className="text-xs text-muted-foreground">With GHL Dates</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${contactStats.needBackfill > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {contactStats.needBackfill}
              </div>
              <div className="text-xs text-muted-foreground">Need Backfill</div>
            </div>
          </div>
        )}

        {/* Backfill Contact Dates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Backfill Leads</h4>
              <p className="text-sm text-muted-foreground">
                Sync all contacts from GHL (updates existing + creates new ones)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadContactStats}
              disabled={isBackfillLoading || isSyncLoading}
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBackfillDates}
              disabled={isBackfillLoading || isSyncLoading || !accountId}
              className="flex-1"
            >
              <Database className="h-4 w-4 mr-2" />
              {isBackfillLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Leads...
                </>
              ) : 'Backfill Leads'}
            </Button>
            
            {isComplete && (
              <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
            )}
          </div>

          {backfillResult && (
            <div className="space-y-3">
              {backfillResult.inProgress && (
                <>
                  <Progress value={backfillResult.progress || 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{backfillResult.message}</span>
                    <span className="font-medium">
                      {backfillResult.syncedCount || 0}
                      {backfillResult.totalEstimate > 0 && ` / ${backfillResult.totalEstimate}`} contacts
                    </span>
                  </div>
                  {backfillResult.batchNumber && (
                    <div className="text-xs text-muted-foreground">
                      Processing batch {backfillResult.batchNumber}...
                    </div>
                  )}
                </>
              )}
              {backfillResult.success && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Last sync: {backfillResult.totalProcessed || 0} contacts processed</span>
                </div>
              )}
              {backfillResult.error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Error: {backfillResult.error}</span>
                </div>
              )}
            </div>
          )}
          
          {!backfillResult && (
            <p className="text-xs text-muted-foreground">
              Fetches ALL contacts from GHL, updates existing ones with correct dates, and creates any missing contacts.
            </p>
          )}
        </div>

        {/* Full Contact Sync */}
        <div className="space-y-3 border-t pt-6">
          <div>
            <h4 className="font-medium">Full Contact Sync</h4>
            <p className="text-sm text-muted-foreground">
              Get ALL contacts from GoHighLevel that aren't in the app yet
            </p>
          </div>
          
          <Button
            variant="default"
            onClick={handleFullContactSync}
            disabled={isBackfillLoading || isSyncLoading || !accountId}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isSyncLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing All Contacts...
              </>
            ) : 'Sync All Contacts from GHL'}
          </Button>

          {syncResult && (
            <div className="space-y-3">
              {syncResult.inProgress && (
                <>
                  <Progress value={syncResult.progress || 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{syncResult.message}</span>
                    <span className="font-medium">
                      {syncResult.syncedCount || 0}
                      {syncResult.totalEstimate > 0 && ` / ${syncResult.totalEstimate}`} contacts
                    </span>
                  </div>
                  {syncResult.batchNumber && (
                    <div className="text-xs text-muted-foreground">
                      Processing batch {syncResult.batchNumber}...
                    </div>
                  )}
                </>
              )}
              {syncResult.success && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Last sync: {syncResult.syncedCount || 0} contacts processed</span>
                </div>
              )}
              {syncResult.error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Error: {syncResult.error}</span>
                </div>
              )}
            </div>
          )}
          
          {!syncResult && (
            <p className="text-xs text-muted-foreground">
              This will fetch every contact from your GoHighLevel account and add any missing ones to the app.
              Existing contacts will be updated with the latest data.
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  )
} 