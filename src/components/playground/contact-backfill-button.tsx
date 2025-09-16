"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useToast } from '@/hooks/use-toast'

interface ContactStats {
  totalContacts: number
  withGhlCreated: number
  needBackfill: number
}

export function ContactBackfillButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [contactStats, setContactStats] = useState<ContactStats | null>(null)
  const { selectedAccountId } = useDashboard()
  const { toast } = useToast()

  // Load contact stats on mount and when account changes
  useEffect(() => {
    if (selectedAccountId) {
      loadContactStats()
    }
  }, [selectedAccountId])

  const loadContactStats = async () => {
    if (!selectedAccountId) return
    
    try {
      const response = await fetch('/api/admin/trigger-contact-backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          checkOnly: true // Add this flag to just check status
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

  const handleBackfill = async () => {
    if (!selectedAccountId) {
      toast({
        title: "No account selected",
        description: "Please select an account first",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      console.log('🔄 Starting contact GHL dates backfill...')
      
      const response = await fetch('/api/admin/backfill-contact-ghl-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccountId
        }),
      })

      const result = await response.json()
      setLastResult(result)

      if (response.ok && result.success) {
        toast({
          title: "Backfill completed",
          description: result.message,
        })
        console.log('✅ Contact backfill completed:', result)
        // Reload stats after successful backfill
        await loadContactStats()
      } else {
        toast({
          title: "Backfill failed",
          description: result.error || 'Unknown error',
          variant: "destructive"
        })
        console.error('❌ Contact backfill failed:', result)
      }
    } catch (error) {
      console.error('❌ Contact backfill error:', error)
      toast({
        title: "Backfill error",
        description: "Failed to start backfill process",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
    }
    if (lastResult?.success) {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>
    }
    if (lastResult && !lastResult.success) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
    }
    return null
  }

  const needsBackfill = contactStats && contactStats.needBackfill > 0
  const isComplete = contactStats && contactStats.needBackfill === 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start mr-2"
          onClick={handleBackfill}
          disabled={isLoading || !selectedAccountId}
        >
          <Database className="h-4 w-4 mr-2" />
          {isLoading ? 'Backfilling...' : needsBackfill ? 'Continue Backfill' : 'Backfill Contact Dates'}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={loadContactStats}
          disabled={isLoading}
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Status Display */}
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {isComplete && (
          <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
        )}
      </div>

      {/* Contact Stats */}
      {contactStats && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Total Contacts:</span>
            <span className="font-medium">{contactStats.totalContacts}</span>
          </div>
          <div className="flex justify-between">
            <span>With GHL Dates:</span>
            <span className="font-medium">{contactStats.withGhlCreated}</span>
          </div>
          <div className="flex justify-between">
            <span>Need Backfill:</span>
            <span className={`font-medium ${contactStats.needBackfill > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {contactStats.needBackfill}
            </span>
          </div>
        </div>
      )}
      
      {lastResult && (
        <div className="text-xs text-muted-foreground">
          {lastResult.success 
            ? `Last run: Processed ${lastResult.totalProcessed || 0} contacts`
            : `Error: ${lastResult.error}`
          }
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Updates contacts with accurate GHL creation dates. Run until "Need Backfill" shows 0.
      </p>
    </div>
  )
} 