"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
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
import { 
  Search, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  ChevronDown, 
  Filter, 
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CalendarIcon
} from "lucide-react"
import { useImpersonation } from "@/hooks/use-impersonation"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { PaymentPlan } from "@/components/payment-plan"

interface OrderedDataItem {
  id: string
  type: 'appointment' | 'discovery'
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
  cash_collected?: number | null
  total_sales_value?: number | null
  pitched?: boolean | null
  watched_assets?: boolean | null
  lead_quality: number | null
  objections?: any | null
  data_filled: boolean
  follow_up_at?: string | null
}

interface OrderedDataFlowProps {
  className?: string
}

export function OrderedDataFlow({ className }: OrderedDataFlowProps) {
  const [items, setItems] = useState<OrderedDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<OrderedDataItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [stats, setStats] = useState({ appointments: 0, discoveries: 0, total: 0 })
  
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
      fetchOrderedData()
    }
  }, [effectiveUser, selectedAccountId])

  const fetchOrderedData = async () => {
    if (!effectiveUser) return
    
    setLoading(true)
    try {
      console.log('🔍 [ordered-data-flow] Fetching ordered data with filters:', {
        effectiveUser: effectiveUser.id,
        selectedAccountId
      })

      const queryParams = new URLSearchParams({
        user_id: effectiveUser.id,
        account_id: selectedAccountId || ''
      })

      const response = await fetch(`/api/update-data/ordered-flow?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data')
      }

      setItems(data.items || [])
      setStats({
        appointments: data.appointments || 0,
        discoveries: data.discoveries || 0,
        total: data.total || 0
      })

    } catch (error) {
      console.error('Error fetching ordered data:', error)
      toast({
        title: "Error",
        description: "Failed to load ordered data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (item: OrderedDataItem) => {
    setSelectedItem(item)
    setEditForm({
      id: item.id,
      callOutcome: item.call_outcome || '',
      showOutcome: item.show_outcome || '',
      cashCollected: item.cash_collected?.toString() || '',
      totalSalesValue: item.total_sales_value?.toString() || '',
      pitched: item.pitched || false,
      watchedAssets: item.watched_assets || false,
      leadQuality: item.lead_quality || 3,
      objections: Array.isArray(item.objections) 
        ? item.objections 
        : [],
      followUpDate: item.follow_up_at || ''
    })
    setEditModalOpen(true)
  }

  const saveItemData = async () => {
    if (!selectedItem) return

    try {
      const payload: any = {
        callOutcome: editForm.callOutcome,
        leadQuality: editForm.leadQuality,
      }

      if (editForm.callOutcome === 'show' && selectedItem.type === 'appointment') {
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

      const endpoint = selectedItem.type === 'appointment' ? '/api/appointments/outcome' : '/api/discoveries/outcome'
      const idField = selectedItem.type === 'appointment' ? 'appointmentId' : 'discoveryId'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [idField]: selectedItem.id,
          payload
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedItem.type === 'appointment' ? 'Appointment' : 'Discovery'} data saved successfully`
        })
        setEditModalOpen(false)
        fetchOrderedData()
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save ${selectedItem.type} data`,
        variant: "destructive"
      })
    }
  }

  const filterData = (items: OrderedDataItem[]): OrderedDataItem[] => {
    return items.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm || 
        item.contact_name.toLowerCase().includes(searchLower) ||
        item.contact_email.toLowerCase().includes(searchLower) ||
        item.setter.toLowerCase().includes(searchLower) ||
        item.account_name.toLowerCase().includes(searchLower)

      return matchesSearch
    })
  }

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

  const getTypeBadge = (type: 'appointment' | 'discovery') => {
    return type === 'appointment' ? (
      <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Calendar className="h-3 w-3 mr-1" />
        Appointment
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
        <Users className="h-3 w-3 mr-1" />
        Discovery
      </Badge>
    )
  }

  const processedItems = filterData(items)

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ordered Data Flow
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All appointments and discoveries ordered chronologically by date booked. Only shows items that have already occurred.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Appointments</p>
                <p className="text-lg font-bold text-blue-600">{stats.appointments}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Discoveries</p>
                <p className="text-lg font-bold text-purple-600">{stats.discoveries}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Total Items</p>
                <p className="text-lg font-bold text-green-600">{stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Pending Data</p>
                <p className="text-lg font-bold text-orange-600">
                  {processedItems.filter(item => !item.data_filled).length}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by contact, email, setter, or account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Flow List */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow ({processedItems.length} items)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading data flow...
            </div>
          ) : processedItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No items found matching your search.
            </div>
          ) : (
            <div className="divide-y">
              {processedItems.map((item, index) => (
                <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Header Row */}
                      <div className="flex items-center gap-3">
                        {getTypeBadge(item.type)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(item.date_booked_for).toLocaleDateString()} at{' '}
                          {new Date(item.date_booked_for).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {item.data_filled ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info Row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.contact_name}</p>
                          <p className="text-sm text-muted-foreground">{item.contact_email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{item.account_name}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.type === 'appointment' ? 'Sales Rep' : 'Setter'}: {item.type === 'appointment' ? item.sales_rep : item.setter}
                          </p>
                        </div>
                      </div>

                      {/* Status Row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Call:</span>
                          {getCallOutcomeBadge(item.call_outcome)}
                        </div>
                        {item.show_outcome && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Show:</span>
                            {getShowOutcomeBadge(item.show_outcome)}
                          </div>
                        )}
                        {item.cash_collected && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Cash:</span>
                            <Badge variant="outline">${item.cash_collected.toLocaleString()}</Badge>
                          </div>
                        )}
                        {item.lead_quality && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Quality:</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={i < item.lead_quality! ? "text-yellow-500" : "text-gray-300"}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                      className="ml-4"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {item.data_filled ? 'Edit' : 'Fill Data'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal - Reuse the same modal structure from appointments-discoveries page */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              Edit {selectedItem?.type === 'appointment' ? 'Appointment' : 'Discovery'} Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 pb-6 -mx-6 space-y-6">
            {selectedItem && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{selectedItem.contact_name}</p>
                    <Badge variant="secondary">{selectedItem.account_name}</Badge>
                    {getTypeBadge(selectedItem.type)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedItem.date_booked_for).toLocaleString()}
                    </div>
                    <span>•</span>
                    <span>Setter: {selectedItem.setter}</span>
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

              {/* Show additional fields only for appointments when call outcome is 'show' */}
              {editForm.callOutcome === 'show' && selectedItem?.type === 'appointment' && (
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

                  {/* Payment fields for won outcomes */}
                  {editForm.showOutcome === 'won' && (
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
              onClick={saveItemData}
              className="min-w-[120px] bg-primary hover:bg-primary/90"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 