"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Loader2, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AppointmentBackfillToolsProps {
  accountId: string
}

interface AppointmentLog {
  eventId: string
  title: string
  startTime: string
  contactId: string | null
  assignedUserId: string | null
  steps: {
    fetchEvent: { status: 'success' | 'failed', message?: string }
    mapCalendar: { status: 'success' | 'failed', message?: string, targetTable?: string }
    fetchContact: { status: 'success' | 'failed', message?: string, contactEmail?: string }
    linkSetter: { status: 'success' | 'failed', message?: string, setterName?: string }
    linkSalesRep: { status: 'success' | 'failed', message?: string, salesRepName?: string }
    createRecord: { status: 'success' | 'failed', message?: string, recordId?: string }
  }
  finalStatus: 'success' | 'failed'
  errorMessage?: string
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
        description: `Successfully processed ${data.created}/${data.totalEvents} appointments/discoveries`,
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

  const getStepIcon = (status: 'success' | 'failed') => {
    if (status === 'success') {
      return <CheckCircle2 className="h-3 w-3 text-green-600 inline-block" />
    }
    return <XCircle className="h-3 w-3 text-red-600 inline-block" />
  }

  const successCount = result?.appointmentLogs?.filter((log: AppointmentLog) => log.finalStatus === 'success').length || 0
  const failedCount = result?.appointmentLogs?.filter((log: AppointmentLog) => log.finalStatus === 'failed').length || 0

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
              Processing Appointments...
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
              <span>Processing appointments...</span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <Progress value={100} className="animate-pulse" />
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
                  <div className="text-muted-foreground">Total Found</div>
                  <div className="text-2xl font-bold text-slate-900">{result.totalEvents}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Processed</div>
                  <div className="text-2xl font-bold text-slate-900">{result.processed}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Success</div>
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Failed</div>
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                </div>
              </div>

              {result.calendarResults && Object.keys(result.calendarResults).length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-sm font-medium text-slate-700 mb-2">Calendar Breakdown:</div>
                  <div className="space-y-1 text-sm text-slate-600">
                    {Object.entries(result.calendarResults).map(([calId, info]: [string, any]) => (
                      <div key={calId} className="flex justify-between">
                        <span className="font-mono text-xs">{calId.slice(0, 12)}...</span>
                        <span>{info.events} events → <strong>{info.targetTable}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Logs */}
            {result.appointmentLogs && result.appointmentLogs.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    📝 Detailed Processing Log ({result.appointmentLogs.length} appointments)
                  </h4>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-slate-200">
                    {result.appointmentLogs.map((log: AppointmentLog, idx: number) => (
                      <div
                        key={log.eventId}
                        className={`p-4 ${log.finalStatus === 'success' ? 'bg-green-50/30' : 'bg-red-50/30'}`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {log.finalStatus === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                              )}
                              <div>
                                <div className="font-semibold text-slate-900">{log.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.startTime).toLocaleString()} • ID: {log.eventId}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            log.finalStatus === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.finalStatus.toUpperCase()}
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="ml-7 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            {getStepIcon(log.steps.mapCalendar.status)}
                            <span className="text-slate-700">Calendar Mapping: </span>
                            <span className="text-muted-foreground">{log.steps.mapCalendar.message}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStepIcon(log.steps.fetchContact.status)}
                            <span className="text-slate-700">Fetch Contact: </span>
                            <span className="text-muted-foreground">{log.steps.fetchContact.message}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStepIcon(log.steps.linkSetter.status)}
                            <span className="text-slate-700">Link Setter: </span>
                            <span className="text-muted-foreground">{log.steps.linkSetter.message}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStepIcon(log.steps.linkSalesRep.status)}
                            <span className="text-slate-700">Link Sales Rep: </span>
                            <span className="text-muted-foreground">{log.steps.linkSalesRep.message}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStepIcon(log.steps.createRecord.status)}
                            <span className="text-slate-700">Create/Update Record: </span>
                            <span className="text-muted-foreground">{log.steps.createRecord.message}</span>
                          </div>
                        </div>

                        {/* Error Message */}
                        {log.errorMessage && (
                          <div className="ml-7 mt-2 p-2 bg-red-100 rounded text-xs text-red-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">Error:</div>
                              <div>{log.errorMessage}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

