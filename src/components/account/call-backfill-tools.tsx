"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Phone, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { supabase } from '@/lib/supabase'

interface CallBackfillToolsProps {
  accountId: string
}

interface BackfillResult {
  total: number
  processed: number
  skipped: number
  errors: number
  duplicates: number
  inbound: number
}

export function CallBackfillTools({ accountId }: CallBackfillToolsProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null)
  const { toast } = useToast()

  const handleBackfill = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive"
      })
      return
    }

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Process in batches automatically
      let skip = 0
      let hasMore = true
      const aggregatedResults: BackfillResult = {
        total: 0,
        processed: 0,
        skipped: 0,
        errors: 0,
        duplicates: 0,
        inbound: 0
      }

      while (hasMore) {
        console.log(`📥 Processing batch starting at ${skip}...`)
        
        // Update progress UI
        setBatchProgress({ current: skip, total: 0 })

        const response = await fetch('/api/admin/backfill-calls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            accountId,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate + 'T23:59:59').toISOString(),
            skip,
            batchSize: 50
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Backfill failed')
        }

        // Aggregate results
        aggregatedResults.total = data.results.total
        aggregatedResults.processed += data.results.processed
        aggregatedResults.skipped += data.results.skipped
        aggregatedResults.errors += data.results.errors
        aggregatedResults.duplicates += data.results.duplicates
        aggregatedResults.inbound += data.results.inbound

        // Update progress
        setBatchProgress({ 
          current: skip + data.results.batchTotal, 
          total: data.results.total 
        })

        // Check if more batches needed
        hasMore = data.results.hasMore
        if (hasMore) {
          skip = data.results.nextSkip
          console.log(`✅ Batch complete. Continuing with next batch at ${skip}...`)
        } else {
          console.log(`✅ All batches complete!`)
        }
      }
      
      setBatchProgress(null)

      setResult(aggregatedResults)
      toast({
        title: "Backfill Complete",
        description: `Successfully processed ${aggregatedResults.processed}/${aggregatedResults.total} outbound calls`,
      })
    } catch (error: any) {
      console.error('Backfill error:', error)
      toast({
        title: "Backfill Failed",
        description: error.message || 'An error occurred during backfill',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Backfill Outbound Calls
        </CardTitle>
        <CardDescription>
          Import historical outbound call data from GoHighLevel for a specific date range.
          This will assign setters, calculate metrics, and link calls to appointments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>What this does:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Fetches all outbound calls from GHL for the date range</li>
              <li>Assigns setter user IDs by linking to platform users</li>
              <li>Calculates answered (duration &gt; 30s) and meaningful conversation (duration &gt; 120s) flags</li>
              <li>Links calls to appointments within ±30 minutes (marks as booked)</li>
              <li>Skips calls that already exist in the database</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="call-start-date">Start Date</Label>
            <Input
              id="call-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="call-end-date">End Date</Label>
            <Input
              id="call-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <Button
          onClick={handleBackfill}
          disabled={loading || !startDate || !endDate}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Calls...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Start Backfill
            </>
          )}
        </Button>

        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {batchProgress 
                  ? `Processing calls ${batchProgress.current} of ${batchProgress.total}...`
                  : 'Fetching and processing outbound calls...'
                }
              </span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <Progress 
              value={batchProgress ? (batchProgress.current / batchProgress.total) * 100 : 100} 
              className={!batchProgress ? "animate-pulse" : ""}
            />
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                📊 Backfill Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Outbound</div>
                  <div className="text-2xl font-bold text-slate-900">{result.total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Processed</div>
                  <div className="text-2xl font-bold text-green-600">{result.processed}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Skipped</div>
                  <div className="text-2xl font-bold text-orange-600">{result.skipped}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Errors</div>
                  <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-sm font-medium text-slate-700 mb-2">Details:</div>
                <div className="space-y-1 text-sm text-slate-600">
                  {result.duplicates > 0 && (
                    <div className="flex justify-between">
                      <span>Duplicate calls (already in DB):</span>
                      <span className="font-medium">{result.duplicates}</span>
                    </div>
                  )}
                  {result.inbound > 0 && (
                    <div className="flex justify-between">
                      <span>Inbound calls (skipped):</span>
                      <span className="font-medium">{result.inbound}</span>
                    </div>
                  )}
                </div>
              </div>

              {result.processed > 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully processed {result.processed} outbound call{result.processed !== 1 ? 's' : ''}.
                    All calls have been assigned setters, calculated metrics, and linked to appointments where applicable.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

