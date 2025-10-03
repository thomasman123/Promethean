"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Loader2, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AppointmentBackfillToolsProps {
  accountId: string
}

export function AppointmentBackfillTools({ accountId }: AppointmentBackfillToolsProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
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

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/ghl/appointments/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          startIso: new Date(startDate).toISOString(),
          endIso: new Date(endDate).toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Backfill failed')
      }

      setResult(data)
      toast({
        title: "Backfill Complete",
        description: `Successfully processed ${data.created} appointments/discoveries`,
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
          <Calendar className="h-6 w-6" />
          Backfill Appointments & Discoveries
        </CardTitle>
        <CardDescription>
          Import historical appointments and discoveries from GoHighLevel for a specific date range.
          This will link all contacts, users, and attribution data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Note:</strong> Only calendars that are mapped in your calendar settings will be imported.
            Make sure to set up calendar mappings first.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
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
              Backfilling...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Start Backfill
            </>
          )}
        </Button>

        {result && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
            <h4 className="font-semibold text-green-900">Backfill Results</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>✅ Total events found: {result.totalEvents}</p>
              <p>✅ Events processed: {result.processed}</p>
              <p>✅ Records created/updated: {result.created}</p>
              <p>📅 Calendar mappings used: {result.mappingCount}</p>
              
              {result.calendarResults && Object.keys(result.calendarResults).length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Per Calendar:</p>
                  <ul className="ml-4 space-y-1">
                    {Object.entries(result.calendarResults).map(([calId, info]: [string, any]) => (
                      <li key={calId}>
                        {calId}: {info.events} events → {info.targetTable}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <p className="font-medium text-red-700">⚠️ {result.errors.length} errors occurred</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

