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
import { supabase } from "@/lib/supabase"
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
  console.log('🚀 OrderedDataFlow component mounted')
  
  const [items, setItems] = useState<OrderedDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [emptyTestMode, setEmptyTestMode] = useState(false)
  const [hasModeratorAccess, setHasModeratorAccess] = useState(false)
  
  const { toast } = useToast()
  const { isImpersonating } = useImpersonation()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()
  const { selectedAccountId } = useDashboard()

  useEffect(() => {
    if (effectiveUser) {
      checkModeratorAccess()
    }
  }, [effectiveUser, selectedAccountId])

  useEffect(() => {
    if (effectiveUser) {
      fetchOrderedData()
    }
  }, [effectiveUser, selectedAccountId, testMode, emptyTestMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Enter key: Save and continue
      if (e.key === 'Enter' && editForm.callOutcome && !saving) {
        e.preventDefault()
        saveItemData()
      }

      // Arrow keys for lead quality rating (1-5)
      if (e.key >= '1' && e.key <= '5') {
        setEditForm({...editForm, leadQuality: parseInt(e.key)})
      }

      // Arrow left: Previous
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrevious()
      }

      // Arrow right: Next (skip)
      if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [editForm, currentIndex, items.length, saving])

  const checkModeratorAccess = async () => {
    console.log('🔍 Checking moderator access...', { 
      effectiveUser: effectiveUser?.id, 
      selectedAccountId 
    })
    
    if (!effectiveUser || !selectedAccountId) {
      console.log('❌ Missing user or account:', { effectiveUser: !!effectiveUser, selectedAccountId })
      return
    }
    
    try {
      // Check if user is a global admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', effectiveUser.id)
        .single()
      
      console.log('👤 Profile role:', profile?.role)
      
      if (profile?.role === 'admin') {
        console.log('✅ Global admin access granted, setting hasModeratorAccess to true')
        setHasModeratorAccess(true)
        console.log('✅ hasModeratorAccess state updated')
        return
      }

      // Check account-specific moderator access
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', effectiveUser.id)
        .eq('account_id', selectedAccountId)
        .in('role', ['admin', 'moderator'])
        .single()
      
      console.log('🏢 Account access:', access)
      setHasModeratorAccess(!!access)
      console.log('✅ Moderator access:', !!access)
    } catch (error) {
      console.error('❌ Error checking moderator access:', error)
      setHasModeratorAccess(false)
    }
  }

  const fetchOrderedData = async () => {
    if (!effectiveUser) return
    
    setLoading(true)
    try {
      let response, data

      // Use test data endpoint if in test mode
      if (testMode && hasModeratorAccess) {
        const queryParams = new URLSearchParams({
          account_id: selectedAccountId || ''
        })
        response = await fetch(`/api/update-data/test-data?${queryParams}`)
        data = await response.json()
        
        // If empty test mode, return empty array
        if (emptyTestMode) {
          setItems([])
          setLoading(false)
          return
        }
      } else {
        const queryParams = new URLSearchParams({
          user_id: effectiveUser.id,
          account_id: selectedAccountId || ''
        })
        response = await fetch(`/api/update-data/ordered-flow?${queryParams}`)
        data = await response.json()
      }

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

    // In test mode, just simulate save and move to next item
    if (testMode && hasModeratorAccess) {
      setSaving(true)
      setShowSuccessAnimation(true)
      
      setTimeout(() => {
        setShowSuccessAnimation(false)
        setSaving(false)
        
        toast({
          title: "Test Mode",
          description: "No data saved in test mode. Moving to next item.",
        })
        
        setTimeout(() => {
          if (currentIndex < items.length - 1) {
            handleNext()
          } else {
            // In test mode, reset to beginning or show empty state
            if (emptyTestMode) {
              setItems([])
            } else {
              setCurrentIndex(0)
              initializeForm(items[0])
            }
          }
        }, 500)
      }, 1000)
      
      return
    }

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
        // Show success animation
        setShowSuccessAnimation(true)
        setTimeout(() => setShowSuccessAnimation(false), 1000)
        
        toast({
          title: "Success",
          description: `${currentItem.type === 'appointment' ? 'Appointment' : 'Discovery'} data saved`
        })
        
        // Auto-advance to next item after animation
        setTimeout(() => {
          if (currentIndex < items.length - 1) {
            handleNext()
          } else {
            // Refresh data if we're at the end
            fetchOrderedData()
          }
        }, 500)
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

  console.log('🎨 Rendering OrderedDataFlow, hasModeratorAccess:', hasModeratorAccess, 'items:', items.length)
  
  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100
  
  return (
    <div className={cn("w-full max-w-5xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0", className)}>
      {/* Moderator Test Mode Toggle - Always show at top */}
      {hasModeratorAccess && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700">
                    Moderator
                  </Badge>
                  <h3 className="font-semibold text-sm">Test Mode</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  View realistic test data to demo the completion flow. No data will be saved.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <Button
                  variant={testMode && !emptyTestMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTestMode(!testMode || emptyTestMode)
                    setEmptyTestMode(false)
                    setCurrentIndex(0)
                  }}
                  className="w-full md:w-auto"
                >
                  {testMode && !emptyTestMode ? "✓ " : ""}Sample Data
                </Button>
                <Button
                  variant={emptyTestMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTestMode(true)
                    setEmptyTestMode(!emptyTestMode)
                    setCurrentIndex(0)
                  }}
                  className="w-full md:w-auto"
                >
                  {emptyTestMode ? "✓ " : ""}Empty State
                </Button>
                {testMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTestMode(false)
                      setEmptyTestMode(false)
                      setCurrentIndex(0)
                    }}
                    className="w-full md:w-auto"
                  >
                    Exit Test Mode
                  </Button>
                )}
              </div>
            </div>
            {testMode && !emptyTestMode && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">7 Test Items</Badge>
                  <Badge variant="secondary">3 Discoveries</Badge>
                  <Badge variant="secondary">4 Appointments</Badge>
                  <Badge variant="destructive">Overdue Scenarios</Badge>
                  <Badge variant="outline">Won/Lost/Follow-up Cases</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(userLoading || loading) && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-semibold">Loading your data</h3>
              <p className="text-sm text-muted-foreground">Preparing your workflow...</p>
            </div>
            <Progress value={66} className="h-2" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!userLoading && !loading && items.length === 0 && (
        <Card className={cn("w-full max-w-4xl mx-auto", className)}>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">All appointments and discoveries have been updated.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Flow - Only show when we have items */}
      {!userLoading && !loading && items.length > 0 && (
        <>
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl md:text-2xl font-semibold">Update Data Flow</h2>
                <span className="text-sm md:text-base text-muted-foreground font-medium">
                  {currentIndex + 1} of {items.length}
                </span>
              </div>
              <Progress value={((currentIndex + 1) / items.length) * 100} className="h-2.5 md:h-3" />
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                Keyboard: 1-5 for rating, Enter to save, ← → to navigate
              </p>
            </div>
          </div>

          {/* Main Card */}
      <Card className={cn(
        "border-2 transition-all duration-300",
        showSuccessAnimation && "border-green-500 shadow-lg shadow-green-500/20"
      )}>
        <CardHeader className="pb-4 md:pb-6 px-4 md:px-8 pt-6 md:pt-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              {currentItem.type === 'appointment' ? (
                <div className="p-2.5 md:p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
              ) : (
                <div className="p-2.5 md:p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl md:text-2xl">
                  {currentItem.type === 'appointment' ? 'Appointment' : 'Discovery Call'}
                </CardTitle>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  {format(new Date(currentItem.date_booked_for), 'PPP')} at {' '}
                  {format(new Date(currentItem.date_booked_for), 'p')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-base md:text-lg px-3 md:px-4 py-1.5 md:py-2 whitespace-nowrap">
              <Building2 className="h-4 w-4 mr-1.5" />
              {currentItem.account_name}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 md:space-y-8 px-4 md:px-8 pb-6 md:pb-8">
          {/* Contact Information */}
          <div className="bg-muted/50 rounded-lg p-4 md:p-6 border">
            <h3 className="font-semibold text-base md:text-lg mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-center gap-2.5 md:gap-3">
                <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm md:text-base">{currentItem.contact_name}</span>
              </div>
              <div className="flex items-center gap-2.5 md:gap-3">
                <Mail className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm md:text-base truncate">{currentItem.contact_email}</span>
              </div>
              <div className="flex items-center gap-2.5 md:gap-3">
                <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm md:text-base">Setter: {currentItem.setter}</span>
              </div>
              {currentItem.sales_rep && (
                <div className="flex items-center gap-2.5 md:gap-3">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm md:text-base">Sales Rep: {currentItem.sales_rep}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Call Outcome */}
            <div className="space-y-3 md:space-y-4">
              <Label htmlFor="call-outcome" className="text-base md:text-lg font-semibold">
                Call Outcome <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={editForm.callOutcome}
                onValueChange={(value) => setEditForm({...editForm, callOutcome: value})}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <label className={cn(
                    "flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] md:min-h-[72px]",
                    editForm.callOutcome === 'show' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}>
                    <RadioGroupItem value="show" id="show" className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="font-semibold text-sm md:text-base">Show</p>
                      <p className="text-xs md:text-sm text-muted-foreground">They attended the call</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] md:min-h-[72px]",
                    editForm.callOutcome === 'no_show' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}>
                    <RadioGroupItem value="no_show" id="no_show" className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="font-semibold text-sm md:text-base">No Show</p>
                      <p className="text-xs md:text-sm text-muted-foreground">They didn't attend</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] md:min-h-[72px]",
                    editForm.callOutcome === 'reschedule' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}>
                    <RadioGroupItem value="reschedule" id="reschedule" className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="font-semibold text-sm md:text-base">Rescheduled</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Moved to another time</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] md:min-h-[72px]",
                    editForm.callOutcome === 'cancel' 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}>
                    <RadioGroupItem value="cancel" id="cancel" className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="font-semibold text-sm md:text-base">Cancelled</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Appointment cancelled</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Lead Quality */}
            <div className="space-y-3 md:space-y-4">
              <Label className="text-base md:text-lg font-semibold">
                Lead Quality <span className="text-red-500">*</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">(Press 1-5)</span>
              </Label>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {[1, 2, 3, 4, 5].map(rating => (
                  <Button
                    key={rating}
                    type="button"
                    variant={editForm.leadQuality === rating ? "default" : "outline"}
                    size="lg"
                    className="flex-1 min-h-[80px] md:min-h-[100px] flex-col gap-2 md:gap-3"
                    onClick={() => setEditForm({...editForm, leadQuality: rating})}
                  >
                    <div className="flex flex-col items-center w-full">
                      <div className="flex mb-1 md:mb-2 text-lg md:text-2xl">
                        {[...Array(rating)].map((_, i) => (
                          <span key={i} className={editForm.leadQuality === rating ? "text-primary-foreground" : "text-amber-400"}>★</span>
                        ))}
                      </div>
                      <span className="text-xs md:text-sm font-medium">
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
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}>
                        <RadioGroupItem value="won" />
                        <div>
                          <p className="font-medium">Won 🎉</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        editForm.showOutcome === 'lost' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}>
                        <RadioGroupItem value="lost" />
                        <div>
                          <p className="font-medium">Lost</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        editForm.showOutcome === 'follow_up' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
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

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between pt-6 md:pt-8 border-t gap-3 md:gap-0">
            <div className="flex gap-2 md:gap-3 order-2 md:order-1">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 md:flex-none min-h-[48px] md:min-h-[44px]"
                size="lg"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-1 md:flex-none min-h-[48px] md:min-h-[44px]"
                size="lg"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </div>
            
            <div className="flex gap-2 order-1 md:order-2">
              <Button
                variant="default"
                onClick={saveItemData}
                disabled={!editForm.callOutcome || saving}
                className="w-full md:min-w-[180px] min-h-[52px] md:min-h-[48px] text-base md:text-sm font-semibold"
                size="lg"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    {showSuccessAnimation ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        Save & Continue
                        {currentIndex < items.length - 1 && (
                          <ChevronRight className="h-5 w-5 ml-2" />
                        )}
                      </>
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
        </>
      )}
    </div>
  )
} 