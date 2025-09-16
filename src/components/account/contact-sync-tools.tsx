"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    try {
      console.log('🔄 Starting contact GHL dates backfill...')
      
      const response = await fetch('/api/admin/backfill-contact-ghl-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        }),
      })

      const result = await response.json()
      setBackfillResult(result)

      if (response.ok && result.success) {
        toast({
          title: "Date backfill completed",
          description: result.message,
        })
        console.log('✅ Contact date backfill completed:', result)
        await loadContactStats()
      } else {
        toast({
          title: "Date backfill failed",
          description: result.error || 'Unknown error',
          variant: "destructive"
        })
        console.error('❌ Contact date backfill failed:', result)
      }
    } catch (error) {
      console.error('❌ Contact date backfill error:', error)
      toast({
        title: "Backfill error",
        description: "Failed to start date backfill process",
        variant: "destructive"
      })
    } finally {
      setIsBackfillLoading(false)
    }
  }

  const handleFullContactSync = async () => {
    setIsSyncLoading(true)
    try {
      console.log('🔄 Starting full contact sync from GHL...')
      
      const response = await fetch('/api/admin/sync-all-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId
        }),
      })

      const result = await response.json()
      setSyncResult(result)

      if (response.ok && result.success) {
        toast({
          title: "Contact sync completed",
          description: result.message,
        })
        console.log('✅ Full contact sync completed:', result)
        await loadContactStats()
      } else {
        toast({
          title: "Contact sync failed",
          description: result.error || 'Unknown error',
          variant: "destructive"
        })
        console.error('❌ Full contact sync failed:', result)
      }
    } catch (error) {
      console.error('❌ Contact sync error:', error)
      toast({
        title: "Sync error",
        description: "Failed to start contact sync process",
        variant: "destructive"
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
              <h4 className="font-medium">Backfill Contact Dates</h4>
              <p className="text-sm text-muted-foreground">
                Update existing contacts with accurate GHL creation dates
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
                  Backfilling...
                </>
              ) : needsBackfill ? 'Continue Backfill' : 'Backfill Contact Dates'}
            </Button>
            
            {isComplete && (
              <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
            )}
          </div>

          {backfillResult && (
            <div className="text-xs text-muted-foreground">
              {backfillResult.success 
                ? `Last run: Processed ${backfillResult.totalProcessed || 0} contacts`
                : `Error: ${backfillResult.error}`
              }
            </div>
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
            <div className="text-xs text-muted-foreground">
              {syncResult.success 
                ? `Last sync: ${syncResult.syncedContacts || 0} contacts processed`
                : `Error: ${syncResult.error}`
              }
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            This will fetch every contact from your GoHighLevel account and add any missing ones to the app.
            Existing contacts will be updated with the latest data.
          </p>
        </div>

      </CardContent>
    </Card>
  )
} 