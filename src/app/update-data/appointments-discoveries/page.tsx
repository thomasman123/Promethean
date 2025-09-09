"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { Search, Edit, Calendar } from "lucide-react"
import { useImpersonation } from "@/hooks/use-impersonation"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AppointmentData {
  id: string
  account_id: string
  account_name: string
  contact_name: string
  contact_email: string
  date_booked_for: string
  setter: string
  sales_rep: string | null
  setter_user_id: string | null
  sales_rep_user_id: string | null
  call_outcome: string | null
  show_outcome: string | null
  cash_collected: number | null
  total_sales_value: number | null
  pitched: boolean | null
  watched_assets: boolean | null
  lead_quality: number | null
  objections: any | null
  data_filled: boolean
}

interface DiscoveryData {
  id: string
  account_id: string
  account_name: string
  contact_name: string
  contact_email: string
  date_booked_for: string
  setter: string
  sales_rep: string | null
  setter_user_id: string | null
  sales_rep_user_id: string | null
  call_outcome: string | null
  show_outcome: string | null
  lead_quality: number | null
  data_filled: boolean
}

export default function AppointmentsDiscoveriesPage() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [discoveries, setDiscoveries] = useState<DiscoveryData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [activeTab, setActiveTab] = useState<"appointments" | "discoveries">("appointments")
  const { toast } = useToast()
  const { isImpersonating } = useImpersonation()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()
  const { selectedAccountId } = useDashboard()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (effectiveUser) {
      fetchData()
    }
  }, [effectiveUser, activeTab, selectedAccountId])

  useEffect(() => {
    // Listen for tab change from topbar
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail.tab)
    }
    
    window.addEventListener('appointmentsTabChanged', handleTabChange as any)
    return () => {
      window.removeEventListener('appointmentsTabChanged', handleTabChange as any)
    }
  }, [])

  const fetchData = async () => {
    if (!effectiveUser) return
    
    setLoading(true)
    try {
      console.log('🔍 [appointments-discoveries] Fetching data with filters:', {
        effectiveUser: effectiveUser.id,
        selectedAccountId,
        activeTab
      })

      // Create API endpoint call that handles impersonation properly
      const queryParams = new URLSearchParams({
        user_id: effectiveUser.id,
        account_id: selectedAccountId || '',
        tab: activeTab
      })

      const response = await fetch(`/api/update-data/appointments-discoveries?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data')
      }

      if (activeTab === 'appointments') {
        setAppointments(data.appointments || [])
      } else {
        setDiscoveries(data.discoveries || [])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (appointment: AppointmentData) => {
    setSelectedAppointment(appointment)
    setEditForm({
      callOutcome: appointment.call_outcome || '',
      showOutcome: appointment.show_outcome || '',
      cashCollected: appointment.cash_collected?.toString() || '',
      totalSalesValue: appointment.total_sales_value?.toString() || '',
      pitched: appointment.pitched || false,
      watchedAssets: appointment.watched_assets || false,
      leadQuality: appointment.lead_quality || 3,
      objections: Array.isArray(appointment.objections) 
        ? appointment.objections.join(', ') 
        : ''
    })
    setEditModalOpen(true)
  }

  const saveAppointmentData = async () => {
    if (!selectedAppointment) return

    try {
      const payload: any = {
        callOutcome: editForm.callOutcome,
        leadQuality: editForm.leadQuality,
      }

      if (editForm.callOutcome === 'show') {
        payload.watchedAssets = editForm.watchedAssets
        payload.pitched = editForm.pitched
        payload.shownOutcome = editForm.showOutcome
        if (editForm.showOutcome === 'won') {
          payload.cashCollected = parseFloat(editForm.cashCollected || '0')
          payload.totalSalesValue = parseFloat(editForm.totalSalesValue || '0')
        }
        if (editForm.objections) {
          payload.objections = editForm.objections.split(',').map((o: string) => o.trim()).filter(Boolean)
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
        setEditModalOpen(false)
        fetchData()
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

  const filteredAppointments = appointments.filter(apt => {
    const searchLower = searchTerm.toLowerCase()
    return (
      apt.contact_name.toLowerCase().includes(searchLower) ||
      apt.contact_email.toLowerCase().includes(searchLower) ||
      apt.setter.toLowerCase().includes(searchLower) ||
      apt.account_name.toLowerCase().includes(searchLower)
    )
  })

  const filteredDiscoveries = discoveries.filter(disc => {
    const searchLower = searchTerm.toLowerCase()
    return (
      disc.contact_name.toLowerCase().includes(searchLower) ||
      disc.contact_email.toLowerCase().includes(searchLower) ||
      disc.setter.toLowerCase().includes(searchLower) ||
      disc.account_name.toLowerCase().includes(searchLower)
    )
  })

  const getCallOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return <Badge variant="outline">Not Set</Badge>
    switch (outcome.toLowerCase()) {
      case 'show':
        return <Badge className="bg-green-100 text-green-800">Show</Badge>
      case 'no_show':
        return <Badge className="bg-red-100 text-red-800">No Show</Badge>
      case 'reschedule':
        return <Badge className="bg-yellow-100 text-yellow-800">Reschedule</Badge>
      case 'cancel':
        return <Badge className="bg-gray-100 text-gray-800">Cancel</Badge>
      default:
        return <Badge variant="outline">{outcome}</Badge>
    }
  }

  const getShowOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null
    switch (outcome.toLowerCase()) {
      case 'won':
        return <Badge className="bg-green-100 text-green-800">Won</Badge>
      case 'lost':
        return <Badge className="bg-red-100 text-red-800">Lost</Badge>
      case 'follow up':
      case 'follow_up':
        return <Badge className="bg-yellow-100 text-yellow-800">Follow Up</Badge>
      default:
        return <Badge variant="outline">{outcome}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className={cn("h-screen", isImpersonating ? "pt-[104px]" : "pt-16")}>
        <div className="h-full p-6">
          {userLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-lg text-muted-foreground">Loading...</div>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by contact name, email, setter, or account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Info Message */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {activeTab === 'appointments' 
                    ? 'Showing appointments where you are the sales representative'
                    : 'Showing discoveries where you are the setter'
                  }
                  {selectedAccountId && ' • Filtered by selected account'}
                </p>
              </div>

              {/* Content based on active tab */}
              {activeTab === "appointments" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>My Appointments ({filteredAppointments.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Loading appointments...
                      </div>
                    ) : filteredAppointments.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No appointments found where you are the sales representative.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Setter</TableHead>
                            <TableHead>Call Outcome</TableHead>
                            <TableHead>Show Outcome</TableHead>
                            <TableHead>Cash</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((apt) => (
                            <TableRow key={apt.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{apt.contact_name}</p>
                                  <p className="text-sm text-muted-foreground">{apt.contact_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{apt.account_name}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(apt.date_booked_for).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>{apt.setter}</TableCell>
                              <TableCell>{getCallOutcomeBadge(apt.call_outcome)}</TableCell>
                              <TableCell>{getShowOutcomeBadge(apt.show_outcome)}</TableCell>
                              <TableCell>
                                {apt.cash_collected ? `$${apt.cash_collected.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell>
                                {apt.data_filled ? (
                                  <Badge variant="outline" className="text-green-600">Complete</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModal(apt)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>My Discoveries ({filteredDiscoveries.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Loading discoveries...
                      </div>
                    ) : filteredDiscoveries.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No discoveries found where you are the setter.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Call Outcome</TableHead>
                            <TableHead>Show Outcome</TableHead>
                            <TableHead>Lead Quality</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDiscoveries.map((disc) => (
                            <TableRow key={disc.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{disc.contact_name}</p>
                                  <p className="text-sm text-muted-foreground">{disc.contact_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{disc.account_name}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(disc.date_booked_for).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>{disc.sales_rep || '-'}</TableCell>
                              <TableCell>{getCallOutcomeBadge(disc.call_outcome)}</TableCell>
                              <TableCell>{disc.show_outcome || '-'}</TableCell>
                              <TableCell>
                                {disc.lead_quality ? (
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={i < disc.lead_quality! ? "text-yellow-500" : "text-gray-300"}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                {disc.data_filled ? (
                                  <Badge variant="outline" className="text-green-600">Complete</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Edit Appointment Data</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-6">
              {selectedAppointment && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{selectedAppointment.contact_name}</p>
                      <Badge variant="secondary">{selectedAppointment.account_name}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedAppointment.date_booked_for).toLocaleString()}
                      </div>
                      <span>•</span>
                      <span>Setter: {selectedAppointment.setter}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                {/* Call Outcome */}
                <div className="space-y-2">
                  <Label htmlFor="call-outcome" className="text-base font-medium">Call Outcome</Label>
                  <Select 
                    value={editForm.callOutcome} 
                    onValueChange={(value) => setEditForm({...editForm, callOutcome: value})}
                  >
                    <SelectTrigger id="call-outcome" className="w-full">
                      <SelectValue placeholder="Select call outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Show
                        </div>
                      </SelectItem>
                      <SelectItem value="no_show">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          No Show
                        </div>
                      </SelectItem>
                      <SelectItem value="reschedule">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Rescheduled
                        </div>
                      </SelectItem>
                      <SelectItem value="cancel">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                          Cancelled
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Quality */}
                <div className="space-y-2">
                  <Label htmlFor="lead-quality" className="text-base font-medium">Lead Quality</Label>
                  <Select 
                    value={editForm.leadQuality?.toString()} 
                    onValueChange={(value) => setEditForm({...editForm, leadQuality: parseInt(value)})}
                  >
                    <SelectTrigger id="lead-quality" className="w-full">
                      <SelectValue placeholder="Select lead quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={i < rating ? "text-yellow-500" : "text-gray-300"}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {rating === 5 && "Excellent"}
                              {rating === 4 && "Good"}
                              {rating === 3 && "Average"}
                              {rating === 2 && "Below Average"}
                              {rating === 1 && "Poor"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editForm.callOutcome === 'show' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Watched Assets */}
                      <div className="space-y-2">
                        <Label htmlFor="watched-assets" className="text-base font-medium">Watched Assets</Label>
                        <Select 
                          value={editForm.watchedAssets ? "yes" : "no"} 
                          onValueChange={(value) => setEditForm({...editForm, watchedAssets: value === "yes"})}
                        >
                          <SelectTrigger id="watched-assets">
                            <SelectValue placeholder="Did they watch assets?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Yes
                              </div>
                            </SelectItem>
                            <SelectItem value="no">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                No
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pitched */}
                      <div className="space-y-2">
                        <Label htmlFor="pitched" className="text-base font-medium">Pitched</Label>
                        <Select 
                          value={editForm.pitched ? "yes" : "no"} 
                          onValueChange={(value) => setEditForm({...editForm, pitched: value === "yes"})}
                        >
                          <SelectTrigger id="pitched">
                            <SelectValue placeholder="Was pitch delivered?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Yes
                              </div>
                            </SelectItem>
                            <SelectItem value="no">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                No
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Show Outcome */}
                    <div className="space-y-2">
                      <Label htmlFor="show-outcome" className="text-base font-medium">Show Outcome</Label>
                      <Select 
                        value={editForm.showOutcome} 
                        onValueChange={(value) => setEditForm({...editForm, showOutcome: value})}
                      >
                        <SelectTrigger id="show-outcome" className="w-full">
                          <SelectValue placeholder="Select show outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="won">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Won 🎉
                            </div>
                          </SelectItem>
                          <SelectItem value="lost">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Lost
                            </div>
                          </SelectItem>
                          <SelectItem value="follow_up">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Follow Up Needed
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editForm.showOutcome === 'won' && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="space-y-2">
                          <Label htmlFor="cash-collected" className="text-base font-medium text-green-900 dark:text-green-100">
                            Cash Collected
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400">$</span>
                            <Input
                              id="cash-collected"
                              type="number"
                              placeholder="0.00"
                              value={editForm.cashCollected}
                              onChange={(e) => setEditForm({...editForm, cashCollected: e.target.value})}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="total-sales" className="text-base font-medium text-green-900 dark:text-green-100">
                            Total Sales Value
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400">$</span>
                            <Input
                              id="total-sales"
                              type="number"
                              placeholder="0.00"
                              value={editForm.totalSalesValue}
                              onChange={(e) => setEditForm({...editForm, totalSalesValue: e.target.value})}
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(editForm.showOutcome === 'lost' || editForm.showOutcome === 'follow_up') && (
                      <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Label htmlFor="objections" className="text-base font-medium text-amber-900 dark:text-amber-100">
                          Objections
                        </Label>
                        <Input
                          id="objections"
                          placeholder="Price, Timing, Need to think, etc. (comma separated)"
                          value={editForm.objections}
                          onChange={(e) => setEditForm({...editForm, objections: e.target.value})}
                          className="border-amber-300 dark:border-amber-700"
                        />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Enter each objection separated by commas
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveAppointmentData}
                className="min-w-[120px] bg-primary hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
} 