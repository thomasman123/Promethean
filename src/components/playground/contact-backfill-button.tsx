"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useToast } from '@/hooks/use-toast'

export function ContactBackfillButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const { selectedAccountId } = useDashboard()
  const { toast } = useToast()

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

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={handleBackfill}
        disabled={isLoading || !selectedAccountId}
      >
        <Database className="h-4 w-4 mr-2" />
        {isLoading ? 'Backfilling...' : 'Backfill Contact Dates'}
      </Button>
      
      {getStatusBadge()}
      
      {lastResult && (
        <div className="text-xs text-muted-foreground">
          {lastResult.success 
            ? `Processed ${lastResult.totalProcessed || 0} contacts`
            : `Error: ${lastResult.error}`
          }
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Updates contacts with accurate GHL creation dates for proper lead tracking and date filtering.
      </p>
    </div>
  )
} 