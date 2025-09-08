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
import { Search, Filter, Edit, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AppointmentData {
  id: string
  contact_name: string
  contact_email: string
  date_booked_for: string
  setter: string
  sales_rep: string | null
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
  contact_name: string
  contact_email: string
  date_booked_for: string
  setter: string
  sales_rep: string | null
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

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch appointments where user is the sales rep
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*, contacts!inner(full_name, email)')
        .eq('sales_rep_user_id', user.id)
        .order('date_booked_for', { ascending: false })

      // Fetch discoveries where user is the setter
      const { data: discoveriesData } = await supabase
        .from('discoveries')
        .select('*, contacts!inner(full_name, email)')
        .eq('setter_user_id', user.id)
        .order('date_booked_for', { ascending: false })

      if (appointmentsData) {
        setAppointments(appointmentsData.map(apt => ({
          id: apt.id,
          contact_name: apt.contacts?.full_name || 'Unknown',
          contact_email: apt.contacts?.email || '',
          date_booked_for: apt.date_booked_for,
          setter: apt.setter,
          sales_rep: apt.sales_rep,
          call_outcome: apt.call_outcome,
          show_outcome: apt.show_outcome,
          cash_collected: apt.cash_collected,
          total_sales_value: apt.total_sales_value,
          pitched: apt.pitched,
          watched_assets: apt.watched_assets,
          lead_quality: apt.lead_quality,
          objections: apt.objections,
          data_filled: apt.data_filled || false
        })))
      }

      if (discoveriesData) {
        setDiscoveries(discoveriesData.map(disc => ({
          id: disc.id,
          contact_name: disc.contacts?.full_name || 'Unknown',
          contact_email: disc.contacts?.email || '',
          date_booked_for: disc.date_booked_for,
          setter: disc.setter,
          sales_rep: disc.sales_rep,
          call_outcome: disc.call_outcome,
          show_outcome: disc.show_outcome,
          lead_quality: disc.lead_quality,
          data_filled: disc.data_filled || false
        })))
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
      apt.setter.toLowerCase().includes(searchLower)
    )
  })

  const filteredDiscoveries = discoveries.filter(disc => {
    const searchLower = searchTerm.toLowerCase()
    return (
      disc.contact_name.toLowerCase().includes(searchLower) ||
      disc.contact_email.toLowerCase().includes(searchLower) ||
      disc.setter.toLowerCase().includes(searchLower)
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
      
      <main className="pt-16 h-screen">
        <div className="h-full max-w-7xl mx-auto p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by contact name, email, or setter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="appointments">
                Appointments ({appointments.length})
              </TabsTrigger>
              <TabsTrigger value="discoveries">
                Discoveries ({discoveries.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discoveries">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Modal */}
          <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Appointment Data</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedAppointment && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedAppointment.contact_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedAppointment.date_booked_for).toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Call Outcome</Label>
                  <RadioGroup
                    value={editForm.callOutcome}
                    onValueChange={(value: string) => setEditForm({...editForm, callOutcome: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="show" id="edit-show" />
                      <Label htmlFor="edit-show">Show</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no_show" id="edit-no_show" />
                      <Label htmlFor="edit-no_show">No Show</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="reschedule" id="edit-reschedule" />
                      <Label htmlFor="edit-reschedule">Rescheduled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cancel" id="edit-cancel" />
                      <Label htmlFor="edit-cancel">Cancelled</Label>
                    </div>
                  </RadioGroup>
                </div>

                {editForm.callOutcome === 'show' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="watched-assets"
                          checked={editForm.watchedAssets}
                          onCheckedChange={(checked: boolean) => 
                            setEditForm({...editForm, watchedAssets: checked})
                          }
                        />
                        <Label htmlFor="watched-assets">Watched Assets</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pitched"
                          checked={editForm.pitched}
                          onCheckedChange={(checked: boolean) => 
                            setEditForm({...editForm, pitched: checked})
                          }
                        />
                        <Label htmlFor="pitched">Pitched</Label>
                      </div>
                    </div>

                    <div>
                      <Label>Show Outcome</Label>
                      <RadioGroup
                        value={editForm.showOutcome}
                        onValueChange={(value: string) => setEditForm({...editForm, showOutcome: value})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="won" id="edit-won" />
                          <Label htmlFor="edit-won">Won 🎉</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="lost" id="edit-lost" />
                          <Label htmlFor="edit-lost">Lost</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="follow_up" id="edit-follow_up" />
                          <Label htmlFor="edit-follow_up">Follow Up Needed</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {editForm.showOutcome === 'won' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Cash Collected</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={editForm.cashCollected}
                            onChange={(e) => setEditForm({...editForm, cashCollected: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Total Sales Value</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={editForm.totalSalesValue}
                            onChange={(e) => setEditForm({...editForm, totalSalesValue: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    {(editForm.showOutcome === 'lost' || editForm.showOutcome === 'follow_up') && (
                      <div>
                        <Label>Objections (comma separated)</Label>
                        <Input
                          placeholder="Price, Timing, Need to think..."
                          value={editForm.objections}
                          onChange={(e) => setEditForm({...editForm, objections: e.target.value})}
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label>Lead Quality</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Button
                        key={rating}
                        variant={editForm.leadQuality === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditForm({...editForm, leadQuality: rating})}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveAppointmentData}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
} 