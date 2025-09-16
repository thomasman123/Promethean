"use client"

import { useState, useEffect, useMemo } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye,
  ArrowUpDown,
  Users
} from "lucide-react"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useImpersonation } from "@/hooks/use-impersonation"
import { useDashboard } from "@/lib/dashboard-context"
import { cn } from "@/lib/utils"
import { format, isAfter, isBefore, addDays } from "date-fns"
import { PaymentPlan } from "@/components/payment-plan"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"

interface PaymentPlanData {
  appointment: {
    id: string
    account_id: string
    setter: string
    sales_rep: string | null
    setter_user_id: string | null
    sales_rep_user_id: string | null
    call_outcome: string | null
    show_outcome: string | null
    cash_collected: number | null
    total_sales_value: number | null
    lead_quality: number | null
    date_booked_for: string
    date_booked: string
    contact_id: string | null
    contacts: {
      id: string
      name: string | null
      email: string | null
      phone: string | null
    } | null
    accounts: {
      id: string
      name: string
    } | null
  }
  payments: Array<{
    id: string
    appointment_id: string
    payment_date: string
    amount: number
    paid: boolean
    created_at: string
    updated_at: string
  }>
  totalScheduled: number
  totalPaid: number
  remainingBalance: number
  nextPaymentDue: string | null
  overduePayments: number
}

interface SummaryData {
  totalPlans: number
  totalScheduled: number
  totalPaid: number
  totalRemaining: number
  overdueCount: number
  completedCount: number
}

export default function PaymentPlansPage() {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("nextPaymentDue")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanData | null>(null)
  
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()
  const { isImpersonating } = useImpersonation()
  const { selectedAccountId } = useDashboard()
  const { toast } = useToast()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load payment plans data using direct Supabase client
  useEffect(() => {
    if (effectiveUser) {
      fetchPaymentPlans()
    }
  }, [effectiveUser, selectedAccountId])

  const fetchPaymentPlans = async () => {
    if (!effectiveUser) return
    
    setLoading(true)
    try {
      console.log('🔍 [payment-plans] Fetching data with:', {
        effectiveUser: effectiveUser.id,
        selectedAccountId
      })

      // Get payment plans with appointment and contact details using direct Supabase query
      let query = supabase
        .from('appointment_payments')
        .select(`
          *,
          appointments!inner (
            id,
            account_id,
            setter,
            sales_rep,
            setter_user_id,
            sales_rep_user_id,
            call_outcome,
            show_outcome,
            cash_collected,
            total_sales_value,
            lead_quality,
            date_booked_for,
            date_booked,
            contact_id,
            contacts (
              id,
              name,
              email,
              phone
            ),
            accounts (
              id,
              name
            )
          )
        `)
        .order('payment_date', { ascending: true });

      // Filter by account if one is selected
      if (selectedAccountId) {
        query = query.eq('appointments.account_id', selectedAccountId);
      }

      const { data: paymentPlansData, error } = await query;

      if (error) {
        console.error('Error fetching payment plans:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to load payment plans",
          variant: "destructive",
        })
        return
      }

      // Group payments by appointment and calculate totals
      const appointmentPayments = paymentPlansData?.reduce((acc, payment) => {
        const appointmentId = payment.appointments.id
        if (!acc[appointmentId]) {
          acc[appointmentId] = {
            appointment: payment.appointments,
            payments: [],
            totalScheduled: 0,
            totalPaid: 0,
            remainingBalance: 0,
            nextPaymentDue: null,
            overduePayments: 0
          }
        }

        acc[appointmentId].payments.push(payment)
        acc[appointmentId].totalScheduled += Number(payment.amount || 0)
        if (payment.paid) {
          acc[appointmentId].totalPaid += Number(payment.amount || 0)
        }

        // Find next payment due
        const paymentDate = new Date(payment.payment_date)
        const now = new Date()
        if (!payment.paid) {
          if (!acc[appointmentId].nextPaymentDue || paymentDate < new Date(acc[appointmentId].nextPaymentDue)) {
            acc[appointmentId].nextPaymentDue = payment.payment_date
          }
          // Count overdue payments
          if (paymentDate < now) {
            acc[appointmentId].overduePayments += 1
          }
        }

        return acc
      }, {} as any) || {}

      // Calculate remaining balance for each appointment
      Object.keys(appointmentPayments).forEach(appointmentId => {
        const plan = appointmentPayments[appointmentId]
        const totalSalesValue = Number(plan.appointment.total_sales_value || 0)
        plan.remainingBalance = totalSalesValue - plan.totalPaid
      })

      // Convert to array and sort by next payment due
      const paymentPlansArray = Object.values(appointmentPayments).sort((a: any, b: any) => {
        if (!a.nextPaymentDue && !b.nextPaymentDue) return 0
        if (!a.nextPaymentDue) return 1
        if (!b.nextPaymentDue) return -1
        return new Date(a.nextPaymentDue).getTime() - new Date(b.nextPaymentDue).getTime()
      })

      // Calculate summary statistics
      const summaryStats: SummaryData = {
        totalPlans: paymentPlansArray.length,
        totalScheduled: paymentPlansArray.reduce((sum: number, plan: any) => sum + Number(plan.totalScheduled || 0), 0),
        totalPaid: paymentPlansArray.reduce((sum: number, plan: any) => sum + Number(plan.totalPaid || 0), 0),
        totalRemaining: paymentPlansArray.reduce((sum: number, plan: any) => sum + Number(plan.remainingBalance || 0), 0),
        overdueCount: paymentPlansArray.filter((plan: any) => plan.overduePayments > 0).length,
        completedCount: paymentPlansArray.filter((plan: any) => plan.remainingBalance <= 0).length
      }

      setPaymentPlans(paymentPlansArray as PaymentPlanData[])
      setSummary(summaryStats)

    } catch (error) {
      console.error('Error fetching payment plans:', error)
      toast({
        title: "Error",
        description: "Failed to load payment plans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort payment plans
  const filteredAndSortedPlans = useMemo(() => {
    let filtered = paymentPlans

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(plan => 
        plan.appointment.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.appointment.contacts?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.appointment.setter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.appointment.sales_rep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.appointment.accounts?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(plan => {
        switch (statusFilter) {
          case "active":
            return plan.remainingBalance > 0 && plan.overduePayments === 0
          case "overdue":
            return plan.overduePayments > 0
          case "completed":
            return plan.remainingBalance <= 0
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case "contactName":
          aVal = a.appointment.contacts?.name || ""
          bVal = b.appointment.contacts?.name || ""
          break
        case "totalScheduled":
          aVal = a.totalScheduled
          bVal = b.totalScheduled
          break
        case "totalPaid":
          aVal = a.totalPaid
          bVal = b.totalPaid
          break
        case "remainingBalance":
          aVal = a.remainingBalance
          bVal = b.remainingBalance
          break
        case "nextPaymentDue":
          aVal = a.nextPaymentDue ? new Date(a.nextPaymentDue).getTime() : Infinity
          bVal = b.nextPaymentDue ? new Date(b.nextPaymentDue).getTime() : Infinity
          break
        default:
          aVal = a.nextPaymentDue ? new Date(a.nextPaymentDue).getTime() : Infinity
          bVal = b.nextPaymentDue ? new Date(b.nextPaymentDue).getTime() : Infinity
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [paymentPlans, searchTerm, statusFilter, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStatusBadge = (plan: PaymentPlanData) => {
    if (plan.remainingBalance <= 0) {
      return <Badge variant="default">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    }
    if (plan.overduePayments > 0) {
      return <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Overdue ({plan.overduePayments})
      </Badge>
    }
    return <Badge variant="outline">
      <Clock className="h-3 w-3 mr-1" />
      Active
    </Badge>
  }

  const getNextPaymentInfo = (plan: PaymentPlanData) => {
    if (!plan.nextPaymentDue) return "No pending payments"
    
    const dueDate = new Date(plan.nextPaymentDue)
    const now = new Date()
    const isOverdue = isBefore(dueDate, now)
    const isUpcoming = isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 7))

    let className = "text-muted-foreground"
    if (isOverdue) className = "text-destructive font-medium"
    else if (isUpcoming) className = "text-foreground font-medium"

    return (
      <span className={className}>
        {format(dueDate, "MMM dd, yyyy")}
        {isOverdue && " (Overdue)"}
        {isUpcoming && " (Due Soon)"}
      </span>
    )
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      </div>
    </TableHead>
  )

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className={cn("h-screen", isImpersonating ? "pt-[104px]" : "pt-16")}>
          <div className="h-full p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg text-muted-foreground">Loading user data...</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className={cn("h-screen", isImpersonating ? "pt-[104px]" : "pt-16")}>
          <div className="h-full p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg text-muted-foreground">Loading payment plans...</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className={cn("h-screen", isImpersonating ? "pt-[104px]" : "pt-16")}>
        <div className="h-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Payment Plans</h1>
            <p className="text-muted-foreground">
              Track and manage payment schedules across all appointments
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalPlans}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${summary.totalScheduled.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${summary.totalPaid.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${summary.totalRemaining.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.overdueCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.completedCount}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by contact, setter, sales rep, or account..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="w-full md:w-48">
                  <Label>Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Plans Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Plans ({filteredAndSortedPlans.length})</CardTitle>
              <CardDescription>
                Click on any row to view detailed payment schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAndSortedPlans.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm || statusFilter !== "all" 
                    ? "No payment plans match your filters." 
                    : "No payment plans found."
                  }
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="contactName">Contact</SortableHeader>
                      <TableHead>Account</TableHead>
                      <TableHead>Sales Rep</TableHead>
                      <SortableHeader field="totalScheduled">Total Scheduled</SortableHeader>
                      <SortableHeader field="totalPaid">Total Paid</SortableHeader>
                      <SortableHeader field="remainingBalance">Remaining</SortableHeader>
                      <SortableHeader field="nextPaymentDue">Next Payment</SortableHeader>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPlans.map((plan) => (
                      <TableRow 
                        key={plan.appointment.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div>{plan.appointment.contacts?.name || "Unknown Contact"}</div>
                            <div className="text-sm text-muted-foreground">
                              {plan.appointment.contacts?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{plan.appointment.accounts?.name}</TableCell>
                        <TableCell>{plan.appointment.sales_rep || "Unassigned"}</TableCell>
                        <TableCell className="font-medium">${plan.totalScheduled.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          ${plan.totalPaid.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${plan.remainingBalance.toFixed(2)}
                        </TableCell>
                        <TableCell>{getNextPaymentInfo(plan)}</TableCell>
                        <TableCell>{getStatusBadge(plan)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPlan(plan)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Payment Plan Detail Modal */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment Plan - {selectedPlan?.appointment.contacts?.name || "Unknown Contact"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Appointment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Contact:</strong> {selectedPlan.appointment.contacts?.name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedPlan.appointment.contacts?.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedPlan.appointment.contacts?.phone}
                  </div>
                  <div>
                    <strong>Account:</strong> {selectedPlan.appointment.accounts?.name}
                  </div>
                  <div>
                    <strong>Setter:</strong> {selectedPlan.appointment.setter}
                  </div>
                  <div>
                    <strong>Sales Rep:</strong> {selectedPlan.appointment.sales_rep}
                  </div>
                  <div>
                    <strong>Appointment Date:</strong> {format(new Date(selectedPlan.appointment.date_booked_for), "PPP")}
                  </div>
                  <div>
                    <strong>Total Sales Value:</strong> ${selectedPlan.appointment.total_sales_value?.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Plan Component */}
              <PaymentPlan
                appointmentId={selectedPlan.appointment.id}
                totalSalesValue={Number(selectedPlan.appointment.total_sales_value || 0)}
                cashCollected={Number(selectedPlan.appointment.cash_collected || 0)}
                onPaymentUpdate={() => {
                  // Refresh the data when payments are updated (no toast here, component handles it)
                  fetchPaymentPlans()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 