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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { Search, Edit, Calendar, ArrowUpDown, ChevronDown, Filter, X } from "lucide-react"
import { useImpersonation } from "@/hooks/use-impersonation"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { PaymentPlan } from "@/components/payment-plan"
import { Loading } from "@/components/ui/loading"

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
  follow_up_at: string | null
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

type SortDirection = 'asc' | 'desc' | null
type SortField = string

interface FilterState {
  callOutcome: string[]
  showOutcome: string[]
  dataFilled: string[]
  dateRange: { start: Date | null; end: Date | null }
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
  const [sortField, setSortField] = useState<SortField>('')
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [filters, setFilters] = useState<FilterState>({
    callOutcome: [],
    showOutcome: [],
    dataFilled: [],
    dateRange: { start: null, end: null }
  })
  
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
      id: appointment.id, // Add the appointment ID
      callOutcome: appointment.call_outcome || '',
      showOutcome: appointment.show_outcome || '',
      cashCollected: appointment.cash_collected?.toString() || '',
      totalSalesValue: appointment.total_sales_value?.toString() || '',
      pitched: appointment.pitched || false,
      watchedAssets: appointment.watched_assets || false,
      leadQuality: appointment.lead_quality || 3,
      objections: Array.isArray(appointment.objections) 
        ? appointment.objections 
        : [],
      followUpDate: appointment.follow_up_at || ''
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
        if (editForm.objections && editForm.objections.length > 0) {
          payload.objections = editForm.objections
        }
        if (editForm.showOutcome === 'follow_up' && editForm.followUpDate) {
          payload.followUpAt = editForm.followUpDate
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
      if (sortDirection === 'desc') {
        setSortField('')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortData = <T extends AppointmentData | DiscoveryData>(data: T[]): T[] => {
    if (!sortField || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortField as keyof T]
      const bValue = b[sortField as keyof T]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const filterData = <T extends AppointmentData | DiscoveryData>(data: T[]): T[] => {
    return data.filter(item => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm || 
        item.contact_name.toLowerCase().includes(searchLower) ||
        item.contact_email.toLowerCase().includes(searchLower) ||
        item.setter.toLowerCase().includes(searchLower) ||
        item.account_name.toLowerCase().includes(searchLower)

      // Call outcome filter
      const matchesCallOutcome = filters.callOutcome.length === 0 || 
        (item.call_outcome && filters.callOutcome.includes(item.call_outcome))

      // Show outcome filter (appointments only)
      const matchesShowOutcome = filters.showOutcome.length === 0 || 
        !('show_outcome' in item) ||
        (item.show_outcome && filters.showOutcome.includes(item.show_outcome))

      // Data filled filter
      const matchesDataFilled = filters.dataFilled.length === 0 ||
        (filters.dataFilled.includes('complete') && item.data_filled) ||
        (filters.dataFilled.includes('pending') && !item.data_filled)

      // Date range filter
      const itemDate = new Date(item.date_booked_for)
      const matchesDateRange = 
        (!filters.dateRange.start || itemDate >= filters.dateRange.start) &&
        (!filters.dateRange.end || itemDate <= filters.dateRange.end)

      return matchesSearch && matchesCallOutcome && matchesShowOutcome && matchesDataFilled && matchesDateRange
    })
  }

  const clearFilters = () => {
    setFilters({
      callOutcome: [],
      showOutcome: [],
      dataFilled: [],
      dateRange: { start: null, end: null }
    })
    setSearchTerm('')
  }

  const hasActiveFilters = 
    filters.callOutcome.length > 0 || 
    filters.showOutcome.length > 0 || 
    filters.dataFilled.length > 0 ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    searchTerm !== ''

  const processedAppointments = sortData(filterData(appointments))
  const processedDiscoveries = sortData(filterData(discoveries))

  const getCallOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return <Badge variant="outline">Not Set</Badge>
    switch (outcome.toLowerCase()) {
      case 'show':
        return <Badge variant="default">Show</Badge>
      case 'no_show':
        return <Badge variant="destructive">No Show</Badge>
      case 'reschedule':
        return <Badge variant="secondary">Reschedule</Badge>
      case 'cancel':
        return <Badge variant="outline">Cancel</Badge>
      default:
        return <Badge variant="outline">{outcome}</Badge>
    }
  }

  const getShowOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null
    switch (outcome.toLowerCase()) {
      case 'won':
        return <Badge variant="default">Won</Badge>
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>
      case 'follow up':
      case 'follow_up':
        return <Badge variant="secondary">Follow Up</Badge>
      default:
        return <Badge variant="outline">{outcome}</Badge>
    }
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          "h-4 w-4",
          sortField === field ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
    </TableHead>
  )

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className={`pt-16 h-screen overflow-y-auto ${isImpersonating ? "pt-[104px]" : "pt-16"}`}>
        <div className="p-6">
          {userLoading ? (
            <Loading text="Loading user data..." />
          ) : (
            <>
              {/* Filters and Search */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by contact, email, setter, or account..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter Dropdowns */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Call Outcome
                        {filters.callOutcome.length > 0 && (
                          <Badge variant="secondary" className="ml-2">{filters.callOutcome.length}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Call Outcome</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {['show', 'no_show', 'reschedule', 'cancel'].map(outcome => (
                        <DropdownMenuCheckboxItem
                          key={outcome}
                          checked={filters.callOutcome.includes(outcome)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              callOutcome: checked
                                ? [...prev.callOutcome, outcome]
                                : prev.callOutcome.filter(o => o !== outcome)
                            }))
                          }}
                        >
                          {outcome.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {activeTab === 'appointments' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Show Outcome
                          {filters.showOutcome.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{filters.showOutcome.length}</Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Show Outcome</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {['won', 'lost', 'follow_up'].map(outcome => (
                          <DropdownMenuCheckboxItem
                            key={outcome}
                            checked={filters.showOutcome.includes(outcome)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                showOutcome: checked
                                  ? [...prev.showOutcome, outcome]
                                  : prev.showOutcome.filter(o => o !== outcome)
                              }))
                            }}
                          >
                            {outcome === 'follow_up' ? 'Follow Up' : 
                             outcome.charAt(0).toUpperCase() + outcome.slice(1)}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Status
                        {filters.dataFilled.length > 0 && (
                          <Badge variant="secondary" className="ml-2">{filters.dataFilled.length}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Data Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {['complete', 'pending'].map(status => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={filters.dataFilled.includes(status)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              dataFilled: checked
                                ? [...prev.dataFilled, status]
                                : prev.dataFilled.filter(s => s !== status)
                            }))
                          }}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Content based on active tab */}
              {activeTab === "appointments" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>My Appointments ({processedAppointments.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <Loading variant="card" text="Loading appointments..." />
                    ) : processedAppointments.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No appointments found matching your filters.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <SortableHeader field="contact_name">Contact</SortableHeader>
                            <SortableHeader field="account_name">Account</SortableHeader>
                            <SortableHeader field="date_booked_for">Date</SortableHeader>
                            <SortableHeader field="setter">Setter</SortableHeader>
                            <SortableHeader field="call_outcome">Call Outcome</SortableHeader>
                            <SortableHeader field="show_outcome">Show Outcome</SortableHeader>
                            <SortableHeader field="cash_collected">Cash</SortableHeader>
                            <SortableHeader field="data_filled">Status</SortableHeader>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedAppointments.map((apt) => (
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
                                  <Badge variant="default">Complete</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
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
                    <CardTitle>My Discoveries ({processedDiscoveries.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <Loading variant="card" text="Loading discoveries..." />
                    ) : processedDiscoveries.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No discoveries found matching your filters.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <SortableHeader field="contact_name">Contact</SortableHeader>
                            <SortableHeader field="account_name">Account</SortableHeader>
                            <SortableHeader field="date_booked_for">Date</SortableHeader>
                            <SortableHeader field="sales_rep">Sales Rep</SortableHeader>
                            <SortableHeader field="call_outcome">Call Outcome</SortableHeader>
                            <SortableHeader field="show_outcome">Show Outcome</SortableHeader>
                            <SortableHeader field="lead_quality">Lead Quality</SortableHeader>
                            <SortableHeader field="data_filled">Status</SortableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedDiscoveries.map((disc) => (
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
                                    <span className="text-sm font-medium">{disc.lead_quality}/5</span>
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                {disc.data_filled ? (
                                  <Badge variant="default">Complete</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold">Edit Appointment Data</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 pb-6 -mx-6 space-y-6">
              {selectedAppointment && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{selectedAppointment.contact_name}</p>
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
                      <SelectItem value="show">Show</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                      <SelectItem value="reschedule">Rescheduled</SelectItem>
                      <SelectItem value="cancel">Cancelled</SelectItem>
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
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
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
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
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
                          <SelectItem value="won">Won 🎉</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="follow_up">Follow Up Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editForm.showOutcome === 'won' && (
                      <>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                          <div className="space-y-2">
                            <Label htmlFor="cash-collected" className="text-base font-medium">
                              Cash Collected
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
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
                            <Label htmlFor="total-sales" className="text-base font-medium">
                              Total Sales Value
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
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

                        {/* Payment Plan - Show when cash collected is less than total sales value */}
                        {Number(editForm.cashCollected || 0) < Number(editForm.totalSalesValue || 0) && 
                         Number(editForm.totalSalesValue || 0) > 0 && (
                          <div className="mt-4">
                            <PaymentPlan
                              appointmentId={editForm.id || selectedAppointment?.id || ''}
                              totalSalesValue={Number(editForm.totalSalesValue || 0)}
                              cashCollected={Number(editForm.cashCollected || 0)}
                              onPaymentUpdate={() => {
                                // Optional: Refresh appointment data or show success message
                                toast({
                                  title: "Payment Updated",
                                  description: "Payment plan has been updated successfully.",
                                });
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {(editForm.showOutcome === 'lost' || editForm.showOutcome === 'follow_up') && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                        <Label className="text-base font-medium">
                          Objections
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {editForm.objections && editForm.objections.length > 0 
                                ? `${editForm.objections.length} objection${editForm.objections.length > 1 ? 's' : ''} selected`
                                : "Select objections"
                              }
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-80">
                            <DropdownMenuLabel>Select objections in order of priority</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {[
                              'Think about it',
                              'Partner Fear',
                              'Partner Logistical',
                              'Money Fear',
                              'Money Logistical',
                              'Fear',
                              'Time',
                              'Logistics',
                              'Competitors',
                              'Value'
                            ].map((objection) => {
                              const isSelected = editForm.objections?.includes(objection);
                              const selectedIndex = editForm.objections?.indexOf(objection);
                              return (
                                <DropdownMenuCheckboxItem
                                  key={objection}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const currentObjections = editForm.objections || [];
                                    if (checked) {
                                      // Add to the end of the array
                                      setEditForm({
                                        ...editForm, 
                                        objections: [...currentObjections, objection]
                                      });
                                    } else {
                                      // Remove from array
                                      setEditForm({
                                        ...editForm, 
                                        objections: currentObjections.filter((obj: string) => obj !== objection)
                                      });
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>{objection}</span>
                                    {isSelected && (
                                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                        {selectedIndex !== undefined ? selectedIndex + 1 : ''}
                                      </Badge>
                                    )}
                                  </div>
                                </DropdownMenuCheckboxItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {editForm.objections && editForm.objections.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Selected objections (in order):</p>
                            <div className="flex flex-wrap gap-2">
                              {editForm.objections.map((objection: string, index: number) => (
                                <Badge key={`${objection}-${index}`} variant="secondary" className="flex items-center gap-1">
                                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                    {index + 1}
                                  </span>
                                  {objection}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditForm({
                                        ...editForm,
                                        objections: editForm.objections?.filter((obj: string) => obj !== objection) || []
                                      });
                                    }}
                                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Click objections in order of priority. Numbers show selection order.
                        </p>
                      </div>
                    )}

                    {editForm.showOutcome === 'follow_up' && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                        <Label htmlFor="follow-up-date" className="text-base font-medium">
                          Follow-up Date & Time *
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal",
                                  !editForm.followUpDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editForm.followUpDate ? format(new Date(editForm.followUpDate), 'PPP') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={editForm.followUpDate ? new Date(editForm.followUpDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Preserve time if it exists, otherwise set to current time
                                    const currentDateTime = editForm.followUpDate ? new Date(editForm.followUpDate) : new Date();
                                    date.setHours(currentDateTime.getHours());
                                    date.setMinutes(currentDateTime.getMinutes());
                                    setEditForm({...editForm, followUpDate: date.toISOString()});
                                  }
                                }}
                                initialFocus
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={editForm.followUpDate ? format(new Date(editForm.followUpDate), 'HH:mm') : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                const [hours, minutes] = e.target.value.split(':');
                                const date = editForm.followUpDate ? new Date(editForm.followUpDate) : new Date();
                                date.setHours(parseInt(hours), parseInt(minutes));
                                setEditForm({...editForm, followUpDate: date.toISOString()});
                              }
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Schedule when the follow-up should occur
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