"use client"

import { useState, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { Search, Calendar, Users, TrendingUp, AlertCircle, Edit, Eye } from "lucide-react"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"
import { Loading } from "@/components/ui/loading"
import { format } from "date-fns"

interface PendingItem {
  id: string
  type: 'appointment' | 'discovery'
  account_id: string
  account_name: string
  contact_name: string
  contact_email: string
  date_booked_for: string
  assigned_user_name: string
  assigned_user_id: string
  is_overdue: boolean
  overdue_hours?: number
}

interface Rep {
  id: string
  name: string
  email: string
  role: string
}

interface Stats {
  total_pending: number
  overdue_count: number
  by_user: {
    user_id: string
    user_name: string
    pending_count: number
    overdue_count: number
    completion_rate: number
  }[]
}

function ModerateContent() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [users, setUsers] = useState<Rep[]>([])
  const [hasModeratorAccess, setHasModeratorAccess] = useState(false)
  
  const { toast } = useToast()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()
  const { selectedAccountId } = useDashboard()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (effectiveUser && selectedAccountId) {
      checkModeratorAccess()
      fetchUsers()
      fetchPendingData()
    }
  }, [effectiveUser, selectedAccountId, selectedUserId, selectedType, showOverdueOnly])

  const checkModeratorAccess = async () => {
    if (!effectiveUser || !selectedAccountId) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', effectiveUser.id)
        .single()
      
      if (profile?.role === 'admin') {
        setHasModeratorAccess(true)
        return
      }

      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', effectiveUser.id)
        .eq('account_id', selectedAccountId)
        .in('role', ['admin', 'moderator'])
        .single()
      
      setHasModeratorAccess(!!access)
    } catch (error) {
      console.error('Error checking moderator access:', error)
      setHasModeratorAccess(false)
    }
  }

  const fetchUsers = async () => {
    if (!selectedAccountId) return
    
    try {
      const response = await fetch(`/api/admin/reps?account_id=${selectedAccountId}`)
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.reps || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchPendingData = async () => {
    if (!effectiveUser || !selectedAccountId) return
    
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        account_id: selectedAccountId,
        ...(selectedUserId && { user_id: selectedUserId }),
        ...(selectedType !== 'all' && { type: selectedType }),
        ...(showOverdueOnly && { overdue_only: 'true' })
      })

      const response = await fetch(`/api/admin/moderate/pending-data?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data')
      }

      setItems(data.items || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching pending data:', error)
      toast({
        title: "Error",
        description: "Failed to load pending data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      item.contact_name.toLowerCase().includes(searchLower) ||
      item.contact_email.toLowerCase().includes(searchLower) ||
      item.assigned_user_name.toLowerCase().includes(searchLower) ||
      item.account_name.toLowerCase().includes(searchLower)
    )
  })

  if (userLoading) {
    return <Loading text="Loading user data..." />
  }

  if (!hasModeratorAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You need moderator or admin access to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-fade-in space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.overdue_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.by_user.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.by_user.length > 0 
                  ? Math.round(stats.by_user.reduce((sum, u) => sum + u.completion_rate, 0) / stats.by_user.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Data Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by contact, email, or assigned user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* User Filter */}
            <Select value={selectedUserId || "all"} onValueChange={(value) => setSelectedUserId(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="appointment">Appointments</SelectItem>
                <SelectItem value="discovery">Discoveries</SelectItem>
              </SelectContent>
            </Select>

            {/* Overdue Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50">
              <Label htmlFor="overdue-toggle" className="text-sm font-medium cursor-pointer">
                Overdue Only
              </Label>
              <Switch
                id="overdue-toggle"
                checked={showOverdueOnly}
                onCheckedChange={setShowOverdueOnly}
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            {loading ? (
              <Loading variant="card" text="Loading pending items..." />
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No pending items found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.contact_name}</p>
                          <p className="text-sm text-muted-foreground">{item.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.type === 'appointment' ? 'Appointment' : 'Discovery'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell>{item.assigned_user_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.date_booked_for), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.is_overdue ? (
                          <Badge variant="destructive">
                            Overdue {item.overdue_hours}h
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Navigate to complete for user
                              window.location.href = `/update-data/appointments-discoveries?moderate_user_id=${item.assigned_user_id}`
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ModeratePage() {
  return (
    <LayoutWrapper>
      <ModerateContent />
    </LayoutWrapper>
  )
}

