"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
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
  Calendar, 
  Clock, 
  User, 
  Users, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarIcon,
  Phone,
  Mail,
  Building2,
  SkipForward
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  
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
      const queryParams = new URLSearchParams({
        user_id: effectiveUser.id,
        account_id: selectedAccountId || ''
      })

      const response = await fetch(`/api/update-data/ordered-flow?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data')
      }

      // Filter to only show items that need data filled
      const pendingItems = (data.items || []).filter((item: OrderedDataItem) => !item.data_filled)
      setItems(pendingItems)
      
      // Initialize form for first item
      if (pendingItems.length > 0) {
        initializeForm(pendingItems[0])
      }

    } catch (error) {
      console.error('Error fetching ordered data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeForm = (item: OrderedDataItem) => {
    setEditForm({
      id: item.id,
      callOutcome: item.call_outcome || '',
      showOutcome: item.show_outcome || '',
      cashCollected: item.cash_collected?.toString() || '',
      totalSalesValue: item.total_sales_value?.toString() || '',
      pitched: item.pitched || false,
      watchedAssets: item.watched_assets || false,
      leadQuality: item.lead_quality || 3,
      objections: Array.isArray(item.objections) ? item.objections : [],
      followUpDate: item.follow_up_at || ''
    })
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      initializeForm(items[newIndex])
    }
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      initializeForm(items[newIndex])
    }
  }

  const handleSkip = () => {
    handleNext()
  }

  const saveItemData = async () => {
    const currentItem = items[currentIndex]
    if (!currentItem) return

    setSaving(true)
    try {
      const payload: any = {
        callOutcome: editForm.callOutcome,
        leadQuality: editForm.leadQuality,
      }

      if (editForm.callOutcome === 'show' && currentItem.type === 'appointment') {
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

      const endpoint = currentItem.type === 'appointment' ? '/api/appointments/outcome' : '/api/discoveries/outcome'
      const idField = currentItem.type === 'appointment' ? 'appointmentId' : 'discoveryId'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [idField]: currentItem.id,
          payload
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${currentItem.type === 'appointment' ? 'Appointment' : 'Discovery'} data saved`
        })
        
        // Auto-advance to next item
        if (currentIndex < items.length - 1) {
          handleNext()
        } else {
          // Refresh data if we're at the end
          await fetchOrderedData()
        }
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save data`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">All appointments and discoveries have been updated.</p>
        </CardContent>
      </Card>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Update Data Flow</h2>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {items.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentItem.type === 'appointment' ? (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              ) : (
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">
                  {currentItem.type === 'appointment' ? 'Appointment' : 'Discovery Call'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(currentItem.date_booked_for), 'PPP')} at {' '}
                  {format(new Date(currentItem.date_booked_for), 'p')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Building2 className="h-4 w-4 mr-1" />
              {currentItem.account_name}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{currentItem.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{currentItem.contact_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Setter: {currentItem.setter}</span>
              </div>
              {currentItem.sales_rep && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Sales Rep: {currentItem.sales_rep}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Call Outcome */}
            <div className="space-y-2">
              <Label htmlFor="call-outcome" className="text-base font-medium">
                Call Outcome <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={editForm.callOutcome}
                onValueChange={(value) => setEditForm({...editForm, callOutcome: value})}
              >
                <div className="grid grid-cols-2 gap-4">
                  <label className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    editForm.callOutcome === 'show' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="show" id="show" />
                    <div>
                      <p className="font-medium">Show</p>
                      <p className="text-sm text-muted-foreground">They attended the call</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    editForm.callOutcome === 'no_show' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="no_show" id="no_show" />
                    <div>
                      <p className="font-medium">No Show</p>
                      <p className="text-sm text-muted-foreground">They didn't attend</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    editForm.callOutcome === 'reschedule' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="reschedule" id="reschedule" />
                    <div>
                      <p className="font-medium">Rescheduled</p>
                      <p className="text-sm text-muted-foreground">Moved to another time</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    editForm.callOutcome === 'cancel' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}>
                    <RadioGroupItem value="cancel" id="cancel" />
                    <div>
                      <p className="font-medium">Cancelled</p>
                      <p className="text-sm text-muted-foreground">Appointment cancelled</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Lead Quality */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Lead Quality <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <Button
                    key={rating}
                    type="button"
                    variant={editForm.leadQuality === rating ? "default" : "outline"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setEditForm({...editForm, leadQuality: rating})}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex mb-1">
                        {[...Array(rating)].map((_, i) => (
                          <span key={i} className="text-yellow-500">★</span>
                        ))}
                      </div>
                      <span className="text-xs">
                        {rating === 5 && "Excellent"}
                        {rating === 4 && "Good"}
                        {rating === 3 && "Average"}
                        {rating === 2 && "Poor"}
                        {rating === 1 && "Bad"}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Additional fields for appointments when call outcome is 'show' */}
            {editForm.callOutcome === 'show' && currentItem.type === 'appointment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Watched Assets */}
                  <div className="space-y-2">
                    <Label htmlFor="watched-assets" className="text-base font-medium">
                      Watched Assets? <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={editForm.watchedAssets ? "yes" : "no"}
                      onValueChange={(value) => setEditForm({...editForm, watchedAssets: value === "yes"})}
                    >
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="yes" />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="no" />
                          <span>No</span>
                        </label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Pitched */}
                  <div className="space-y-2">
                    <Label htmlFor="pitched" className="text-base font-medium">
                      Pitched? <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={editForm.pitched ? "yes" : "no"}
                      onValueChange={(value) => setEditForm({...editForm, pitched: value === "yes"})}
                    >
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="yes" />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="no" />
                          <span>No</span>
                        </label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Show Outcome */}
                <div className="space-y-2">
                  <Label htmlFor="show-outcome" className="text-base font-medium">
                    Show Outcome <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={editForm.showOutcome}
                    onValueChange={(value) => setEditForm({...editForm, showOutcome: value})}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        editForm.showOutcome === 'won' 
                          ? "border-green-500 bg-green-50" 
                          : "border-border hover:border-green-500/50"
                      )}>
                        <RadioGroupItem value="won" />
                        <div>
                          <p className="font-medium">Won 🎉</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        editForm.showOutcome === 'lost' 
                          ? "border-red-500 bg-red-50" 
                          : "border-border hover:border-red-500/50"
                      )}>
                        <RadioGroupItem value="lost" />
                        <div>
                          <p className="font-medium">Lost</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        editForm.showOutcome === 'follow_up' 
                          ? "border-yellow-500 bg-yellow-50" 
                          : "border-border hover:border-yellow-500/50"
                      )}>
                        <RadioGroupItem value="follow_up" />
                        <div>
                          <p className="font-medium">Follow Up</p>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Payment fields for won outcomes */}
                {editForm.showOutcome === 'won' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={saveItemData}
                disabled={!editForm.callOutcome || saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    Save & Continue
                    {currentIndex < items.length - 1 && (
                      <ChevronRight className="h-4 w-4 ml-2" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="flex justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Completed Today: {currentIndex}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Remaining: {items.length - currentIndex - 1}</span>
        </div>
      </div>
    </div>
  )
} 