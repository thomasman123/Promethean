"use client"

import { useState, useEffect } from "react"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { Target, Plus, Edit, Trash2, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useDashboard } from "@/lib/dashboard-context"
import { Loading } from "@/components/ui/loading"
import { MetricSelector } from "@/components/dashboard/metric-selector"

interface KPI {
  id: string
  account_id: string
  name: string
  description?: string
  metric_key: string
  target_value: number
  target_type: 'minimum' | 'maximum' | 'exact'
  period_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  period_days?: number
  applies_to: 'user' | 'account'
  assigned_user_ids?: string[]
  assigned_roles?: string[]
  is_active: boolean
  created_at: string
}

interface KPIProgress {
  id: string
  kpi_definition_id: string
  user_id: string | null
  period_start: string
  period_end: string
  current_value: number
  target_value: number
  progress_percentage: number
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded'
  kpi_definition: {
    name: string
    metric_key: string
  }
}

function KPIsContent() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [myProgress, setMyProgress] = useState<KPIProgress[]>([])
  const [teamProgress, setTeamProgress] = useState<KPIProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [metricSelectorOpen, setMetricSelectorOpen] = useState(false)
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null)
  const [hasModeratorAccess, setHasModeratorAccess] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("my-kpis")
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric_key: '',
    target_value: '',
    target_type: 'minimum' as 'minimum' | 'maximum' | 'exact',
    period_type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    period_days: '',
    applies_to: 'user' as 'user' | 'account'
  })

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
      fetchKPIs()
      fetchProgress()
    }
  }, [effectiveUser, selectedAccountId])

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

  const fetchKPIs = async () => {
    if (!selectedAccountId) return
    
    try {
      const response = await fetch(`/api/kpis/definitions?account_id=${selectedAccountId}`)
      const data = await response.json()
      
      if (response.ok) {
        setKpis(data.kpis || [])
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error)
    }
  }

  const fetchProgress = async () => {
    if (!effectiveUser || !selectedAccountId) return
    
    setLoading(true)
    try {
      // Fetch user's own progress
      const myResponse = await fetch(`/api/kpis/progress?account_id=${selectedAccountId}&user_id=${effectiveUser.id}`)
      const myData = await myResponse.json()
      
      if (myResponse.ok) {
        setMyProgress(myData.progress || [])
      }

      // If moderator, fetch team progress
      if (hasModeratorAccess) {
        const teamResponse = await fetch(`/api/kpis/progress?account_id=${selectedAccountId}`)
        const teamData = await teamResponse.json()
        
        if (teamResponse.ok) {
          setTeamProgress(teamData.progress || [])
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingKpi(null)
    setFormData({
      name: '',
      description: '',
      metric_key: '',
      target_value: '',
      target_type: 'minimum',
      period_type: 'daily',
      period_days: '',
      applies_to: 'user'
    })
    setEditModalOpen(true)
  }

  const openEditModal = (kpi: KPI) => {
    setEditingKpi(kpi)
    setFormData({
      name: kpi.name,
      description: kpi.description || '',
      metric_key: kpi.metric_key,
      target_value: kpi.target_value.toString(),
      target_type: kpi.target_type,
      period_type: kpi.period_type,
      period_days: kpi.period_days?.toString() || '',
      applies_to: kpi.applies_to
    })
    setEditModalOpen(true)
  }

  const handleSaveKPI = async () => {
    if (!formData.name || !formData.metric_key || !formData.target_value) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const payload = {
        ...formData,
        account_id: selectedAccountId,
        target_value: parseFloat(formData.target_value),
        period_days: formData.period_days ? parseInt(formData.period_days) : null
      }

      let response
      if (editingKpi) {
        response = await fetch('/api/kpis/definitions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingKpi.id, ...payload })
        })
      } else {
        response = await fetch('/api/kpis/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: `KPI ${editingKpi ? 'updated' : 'created'} successfully`
        })
        setEditModalOpen(false)
        fetchKPIs()
        fetchProgress()
      } else {
        throw new Error('Failed to save KPI')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save KPI",
        variant: "destructive"
      })
    }
  }

  const handleDeleteKPI = async (id: string) => {
    if (!confirm('Are you sure you want to delete this KPI? This will also delete all progress and history data.')) {
      return
    }

    try {
      const response = await fetch(`/api/kpis/definitions?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "KPI deleted successfully"
        })
        fetchKPIs()
        fetchProgress()
      } else {
        throw new Error('Failed to delete KPI')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete KPI",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge variant="default" className="bg-green-500">On Track</Badge>
      case 'at_risk':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">At Risk</Badge>
      case 'behind':
        return <Badge variant="destructive">Behind</Badge>
      case 'exceeded':
        return <Badge variant="default" className="bg-blue-500">Exceeded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'at_risk':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'behind':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'exceeded':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  if (userLoading || loading) {
    return <Loading text="Loading KPIs..." />
  }

  const statusCounts = myProgress.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="page-fade-in space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['on_track'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['at_risk'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behind</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['behind'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exceeded</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['exceeded'] || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="my-kpis">My KPIs</TabsTrigger>
            {hasModeratorAccess && <TabsTrigger value="team-kpis">Team KPIs</TabsTrigger>}
            {hasModeratorAccess && <TabsTrigger value="manage">Manage KPIs</TabsTrigger>}
          </TabsList>
          
          {hasModeratorAccess && activeTab === "manage" && (
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create KPI
            </Button>
          )}
        </div>

        {/* My KPIs Tab */}
        <TabsContent value="my-kpis">
          <Card>
            <CardHeader>
              <CardTitle>My Active KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              {myProgress.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active KPIs assigned to you yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myProgress.map((progress) => (
                    <div key={progress.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(progress.status)}
                          <h4 className="font-semibold">{progress.kpi_definition.name}</h4>
                        </div>
                        {getStatusBadge(progress.status)}
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>{progress.current_value.toLocaleString()} / {progress.target_value.toLocaleString()}</span>
                          <span>{Math.round(progress.progress_percentage)}%</span>
                        </div>
                        <Progress value={Math.min(progress.progress_percentage, 100)} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Period: {new Date(progress.period_start).toLocaleDateString()} - {new Date(progress.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team KPIs Tab */}
        {hasModeratorAccess && (
          <TabsContent value="team-kpis">
            <Card>
              <CardHeader>
                <CardTitle>Team KPI Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {teamProgress.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No team KPI data available.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI Name</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamProgress.map((progress) => (
                        <TableRow key={progress.id}>
                          <TableCell className="font-medium">{progress.kpi_definition.name}</TableCell>
                          <TableCell>{progress.user_id ? 'User' : 'Account'}</TableCell>
                          <TableCell>
                            <div className="w-32">
                              <Progress value={Math.min(progress.progress_percentage, 100)} />
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(progress.progress_percentage)}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(progress.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Manage KPIs Tab */}
        {hasModeratorAccess && (
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>KPI Definitions</CardTitle>
              </CardHeader>
              <CardContent>
                {kpis.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No KPIs defined yet.</p>
                    <Button onClick={openCreateModal} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First KPI
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Applies To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpis.map((kpi) => (
                        <TableRow key={kpi.id}>
                          <TableCell className="font-medium">{kpi.name}</TableCell>
                          <TableCell>
                            <code className="text-xs">{kpi.metric_key}</code>
                          </TableCell>
                          <TableCell>
                            {kpi.target_type === 'minimum' && '≥ '}
                            {kpi.target_type === 'maximum' && '≤ '}
                            {kpi.target_type === 'exact' && '= '}
                            {kpi.target_value.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">{kpi.period_type}</TableCell>
                          <TableCell className="capitalize">{kpi.applies_to}</TableCell>
                          <TableCell>
                            {kpi.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(kpi)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteKPI(kpi.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit KPI Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Edit KPI' : 'Create New KPI'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">KPI Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Daily Appointments Goal"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Metric *</Label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setMetricSelectorOpen(true)}
              >
                {formData.metric_key || 'Select a metric...'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_value">Target Value *</Label>
                <Input
                  id="target_value"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.target_value}
                  onChange={(e) => setFormData({...formData, target_value: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_type">Target Type *</Label>
                <Select value={formData.target_type} onValueChange={(value: any) => setFormData({...formData, target_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimum">Minimum (≥)</SelectItem>
                    <SelectItem value="maximum">Maximum (≤)</SelectItem>
                    <SelectItem value="exact">Exact (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_type">Period Type *</Label>
                <Select value={formData.period_type} onValueChange={(value: any) => setFormData({...formData, period_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.period_type === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="period_days">Period Days *</Label>
                  <Input
                    id="period_days"
                    type="number"
                    placeholder="e.g., 7"
                    value={formData.period_days}
                    onChange={(e) => setFormData({...formData, period_days: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="applies_to">Applies To *</Label>
              <Select value={formData.applies_to} onValueChange={(value: any) => setFormData({...formData, applies_to: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Individual Users</SelectItem>
                  <SelectItem value="account">Account Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveKPI}>
              {editingKpi ? 'Update KPI' : 'Create KPI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Selector Modal */}
      <Dialog open={metricSelectorOpen} onOpenChange={setMetricSelectorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Metric</DialogTitle>
          </DialogHeader>
          <MetricSelector
            selectedMetric={formData.metric_key}
            onSelect={(metric) => {
              setFormData({...formData, metric_key: metric})
              setMetricSelectorOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function KPIsPage() {
  return (
    <LayoutWrapper>
      <KPIsContent />
    </LayoutWrapper>
  )
}

