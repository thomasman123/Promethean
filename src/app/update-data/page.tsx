"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

interface TaskAppointment {
  id: string
  contact_name: string
  contact_email: string
  date_booked_for: string
  setter: string
  call_outcome: string | null
  show_outcome: string | null
  data_filled: boolean
}

export default function UpdateDataPage() {
  const [todayAppointments, setTodayAppointments] = useState<TaskAppointment[]>([])
  const [pendingAppointments, setPendingAppointments] = useState<TaskAppointment[]>([])
  const [recentCompleted, setRecentCompleted] = useState<TaskAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<TaskAppointment | null>(null)
  const [quickFlowStep, setQuickFlowStep] = useState(0)
  const [quickFlowData, setQuickFlowData] = useState<any>({})
  const { toast } = useToast()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      // Fetch appointments where user is the sales rep
      const [todayRes, pendingRes, completedRes] = await Promise.all([
        // Today's appointments
        supabase
          .from('appointments')
          .select('id, date_booked_for, setter, call_outcome, show_outcome, data_filled, contacts!inner(full_name, email)')
          .eq('sales_rep_user_id', user.id)
          .gte('date_booked_for', today.toISOString())
          .lt('date_booked_for', tomorrow.toISOString())
          .order('date_booked_for'),
        
        // Pending data entry (not filled)
        supabase
          .from('appointments')
          .select('id, date_booked_for, setter, call_outcome, show_outcome, data_filled, contacts!inner(full_name, email)')
          .eq('sales_rep_user_id', user.id)
          .eq('data_filled', false)
          .lt('date_booked_for', today.toISOString())
          .order('date_booked_for', { ascending: false })
          .limit(20),
        
        // Recently completed (last 2 days)
        supabase
          .from('appointments')
          .select('id, date_booked_for, setter, call_outcome, show_outcome, data_filled, contacts!inner(full_name, email)')
          .eq('sales_rep_user_id', user.id)
          .eq('data_filled', true)
          .gte('updated_at', twoDaysAgo.toISOString())
          .order('updated_at', { ascending: false })
          .limit(10)
      ])

      // Map the results to our interface
      const mapAppointments = (data: any[]): TaskAppointment[] => 
        data?.map(apt => ({
          id: apt.id,
          contact_name: apt.contacts?.full_name || 'Unknown',
          contact_email: apt.contacts?.email || '',
          date_booked_for: apt.date_booked_for,
          setter: apt.setter,
          call_outcome: apt.call_outcome,
          show_outcome: apt.show_outcome,
          data_filled: apt.data_filled
        })) || []

      setTodayAppointments(mapAppointments(todayRes.data || []))
      setPendingAppointments(mapAppointments(pendingRes.data || []))
      setRecentCompleted(mapAppointments(completedRes.data || []))
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const startQuickFlow = (appointment: TaskAppointment) => {
    setSelectedAppointment(appointment)
    setQuickFlowStep(1)
    setQuickFlowData({})
  }

  const handleQuickFlowNext = () => {
    if (quickFlowStep === 1 && quickFlowData.callOutcome === 'show') {
      setQuickFlowStep(2)
    } else if (quickFlowStep === 2) {
      setQuickFlowStep(3)
    } else {
      submitQuickFlow()
    }
  }

  const submitQuickFlow = async () => {
    if (!selectedAppointment) return

    try {
      const payload: any = {
        callOutcome: quickFlowData.callOutcome,
        leadQuality: quickFlowData.leadQuality || 3,
      }

      if (quickFlowData.callOutcome === 'show') {
        payload.watchedAssets = quickFlowData.watchedAssets === 'yes'
        payload.pitched = quickFlowData.pitched === 'yes'
        payload.shownOutcome = quickFlowData.showOutcome
        if (quickFlowData.showOutcome === 'won') {
          payload.cashCollected = parseFloat(quickFlowData.cashCollected || '0')
          payload.totalSalesValue = parseFloat(quickFlowData.totalSalesValue || '0')
        }
        if (quickFlowData.objections) {
          payload.objections = quickFlowData.objections.split(',').map((o: string) => o.trim())
        }
      }

      const response = await fetch('/api/appointments/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          payload
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Appointment data saved successfully"
        })
        setQuickFlowStep(0)
        setSelectedAppointment(null)
        setQuickFlowData({})
        fetchTasks() // Refresh the lists
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save appointment data",
        variant: "destructive"
      })
    }
  }

  const QuickFlowModal = () => {
    if (!selectedAppointment || quickFlowStep === 0) return null

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Quick Entry - {selectedAppointment.contact_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedAppointment.date_booked_for).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickFlowStep === 1 && (
              <>
                <Label>Did they show up?</Label>
                <RadioGroup
                  value={quickFlowData.callOutcome || ''}
                  onValueChange={(value: string) => setQuickFlowData({...quickFlowData, callOutcome: value})}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="show" id="show" />
                    <Label htmlFor="show">Show</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no_show" id="no_show" />
                    <Label htmlFor="no_show">No Show</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reschedule" id="reschedule" />
                    <Label htmlFor="reschedule">Rescheduled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cancel" id="cancel" />
                    <Label htmlFor="cancel">Cancelled</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label>Lead Quality (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Button
                        key={rating}
                        variant={quickFlowData.leadQuality === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQuickFlowData({...quickFlowData, leadQuality: rating})}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {quickFlowStep === 2 && quickFlowData.callOutcome === 'show' && (
              <>
                <div>
                  <Label>Did they watch assets?</Label>
                  <RadioGroup
                    value={quickFlowData.watchedAssets || ''}
                    onValueChange={(value: string) => setQuickFlowData({...quickFlowData, watchedAssets: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="watched_yes" />
                      <Label htmlFor="watched_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="watched_no" />
                      <Label htmlFor="watched_no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Did you pitch?</Label>
                  <RadioGroup
                    value={quickFlowData.pitched || ''}
                    onValueChange={(value: string) => setQuickFlowData({...quickFlowData, pitched: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="pitched_yes" />
                      <Label htmlFor="pitched_yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="pitched_no" />
                      <Label htmlFor="pitched_no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Show Outcome</Label>
                  <RadioGroup
                    value={quickFlowData.showOutcome || ''}
                    onValueChange={(value: string) => setQuickFlowData({...quickFlowData, showOutcome: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="won" id="won" />
                      <Label htmlFor="won">Won 🎉</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lost" id="lost" />
                      <Label htmlFor="lost">Lost</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="follow_up" id="follow_up" />
                      <Label htmlFor="follow_up">Follow Up Needed</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {quickFlowStep === 3 && quickFlowData.showOutcome === 'won' && (
              <>
                <div>
                  <Label>Cash Collected</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={quickFlowData.cashCollected || ''}
                    onChange={(e) => setQuickFlowData({...quickFlowData, cashCollected: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Total Sales Value</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={quickFlowData.totalSalesValue || ''}
                    onChange={(e) => setQuickFlowData({...quickFlowData, totalSalesValue: e.target.value})}
                  />
                </div>
              </>
            )}

            {quickFlowStep === 3 && (quickFlowData.showOutcome === 'lost' || quickFlowData.showOutcome === 'follow_up') && (
              <div>
                <Label>Objections (comma separated)</Label>
                <Input
                  placeholder="Price, Timing, Need to think..."
                  value={quickFlowData.objections || ''}
                  onChange={(e) => setQuickFlowData({...quickFlowData, objections: e.target.value})}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setQuickFlowStep(0)
                setSelectedAppointment(null)
                setQuickFlowData({})
              }}>
                Cancel
              </Button>
              <Button onClick={handleQuickFlowNext}>
                {quickFlowStep === 3 || (quickFlowStep === 1 && quickFlowData.callOutcome !== 'show') ? 'Save' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16 h-screen">
        <div className="h-full p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Entry</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed (48h)</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentCompleted.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pendingAppointments.length + recentCompleted.length > 0 
                    ? Math.round((recentCompleted.length / (pendingAppointments.length + recentCompleted.length)) * 100)
                    : 100}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Appointments */}
          {todayAppointments.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today's Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                      <div>
                        <p className="font-medium">{apt.contact_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.date_booked_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Set by {apt.setter}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => startQuickFlow(apt)}>
                        Quick Entry
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Data Entry */}
          {pendingAppointments.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Awaiting Data Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                      <div>
                        <p className="font-medium">{apt.contact_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.date_booked_for).toLocaleDateString()} • Set by {apt.setter}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-yellow-600">
                          Pending
                        </Badge>
                        <Button size="sm" onClick={() => startQuickFlow(apt)}>
                          Fill Data
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recently Completed */}
          {recentCompleted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Recently Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentCompleted.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{apt.contact_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.date_booked_for).toLocaleDateString()} • {apt.call_outcome}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        Completed
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <QuickFlowModal />
      </main>
    </div>
  )
} 