"use client"

import { useState, useEffect, useMemo } from "react"
import { TopBar } from "@/components/layout/topbar"
import { UserMetricsTable, type UserMetric, type MetricColumn } from "@/components/data-view/user-metrics-table"
import { MetricSelectionModal } from "@/components/data-view/metric-selection-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { createBrowserClient } from "@supabase/ssr"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MetricDefinition } from "@/lib/metrics/types"
import { useToast } from "@/hooks/use-toast"

export default function DataViewPage() {
  const { selectedAccountId, dateRange } = useDashboard()
  const [users, setUsers] = useState<UserMetric[]>([])
  const [tableConfig, setTableConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [metricColumns, setMetricColumns] = useState<MetricColumn[]>([])
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get role filter and table ID from URL params or localStorage
  const [roleFilter, setRoleFilter] = useState<'both' | 'setter' | 'rep'>('both')
  const [currentTableId, setCurrentTableId] = useState<string | null>(null)

  // Listen for custom events from topbar
  useEffect(() => {
    const handleRoleFilterChange = (event: CustomEvent) => {
      setRoleFilter(event.detail.roleFilter)
    }
    
    const handleTableChange = (event: CustomEvent) => {
      setCurrentTableId(event.detail.tableId)
    }

    window.addEventListener('roleFilterChanged' as any, handleRoleFilterChange)
    window.addEventListener('tableChanged' as any, handleTableChange)

    return () => {
      window.removeEventListener('roleFilterChanged' as any, handleRoleFilterChange)
      window.removeEventListener('tableChanged' as any, handleTableChange)
    }
  }, [])

  // Load users based on role filter
  useEffect(() => {
    if (!selectedAccountId) return
    loadUsers()
  }, [selectedAccountId, roleFilter])

  // Load metric data when users change and we have metric columns
  useEffect(() => {
    if (metricColumns.length > 0 && users.length > 0) {
      console.log('🔄 Reloading metrics due to users/dateRange change:', { 
        metricColumns: metricColumns.length, 
        users: users.length, 
        dateRange: { 
          from: dateRange.from?.toISOString(), 
          to: dateRange.to?.toISOString() 
        } 
      })
      loadAllMetricData(metricColumns)
    }
  }, [users.length, selectedAccountId, dateRange]) // Add dateRange dependency

  // Reload metrics when dateRange changes (specifically for topbar date picker)
  useEffect(() => {
    if (metricColumns.length > 0 && users.length > 0 && dateRange.from && dateRange.to) {
      console.log('📅 Date range changed, reloading metrics:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        metricsCount: metricColumns.length
      })
      loadAllMetricData(metricColumns)
    }
  }, [dateRange.from, dateRange.to])

  // Load table configuration and metric columns
  useEffect(() => {
    if (!currentTableId) {
      setTableConfig(null)
      setMetricColumns([])
      return
    }
    loadTableConfig()
  }, [currentTableId])

  async function loadUsers() {
    setLoading(true)
    
    try {
      console.log('Loading users for account:', selectedAccountId)
      
      // Use the server-side API that handles global admin permissions properly
      const response = await fetch(`/api/data-view/users?accountId=${selectedAccountId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading users:', result.error)
        setLoading(false)
        return
      }

      console.log('Loaded users from API:', result.users)

      // Filter and transform users based on role filter
      const userMetrics: UserMetric[] = (result.users || [])
        .filter((user: any) => {
          if (roleFilter === 'both') return true
          if (roleFilter === 'setter') return user.role === 'setter'
          if (roleFilter === 'rep') return user.role === 'rep'
          return false
        })
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Use the functional role from API (setter/rep/inactive)
        }))

      console.log('Filtered user metrics:', userMetrics)
      setUsers(userMetrics)
      
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadTableConfig() {
    const { data, error } = await supabase
      .from('data_tables')
      .select('*')
      .eq('id', currentTableId)
      .single()

    if (error) {
      console.error('Error loading table config:', error)
      return
    }

    setTableConfig(data)
    
    // Extract metric columns from table configuration
    const columns = data.columns || []
    const metricCols = columns
      .filter((col: any) => col.metricName) // Only columns with metric data
      .map((col: any) => ({
        id: col.id,
        metricName: col.metricName,
        displayName: col.header,
        unit: col.unit
      }))
    
    setMetricColumns(metricCols)
    
    // Load metric data for existing metric columns
    if (metricCols.length > 0 && users.length > 0) {
      await loadAllMetricData(metricCols)
    }
  }

  const loadAllMetricData = async (metricCols: MetricColumn[]) => {
    if (!selectedAccountId || users.length === 0) return

    setMetricsLoading(true)
    try {
      const userIds = users.map(user => user.id)
      
      // Load all metrics in parallel
      const metricPromises = metricCols.map(async (metricColumn) => {
        try {
          const response = await fetch('/api/data-view/user-metrics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountId: selectedAccountId,
              userIds,
              metricName: metricColumn.metricName,
              dateRange: dateRange,
              roleFilter
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to load ${metricColumn.displayName}`)
          }

          const result = await response.json()
          return { metricColumn, result }
        } catch (error) {
          console.error(`Error loading ${metricColumn.displayName}:`, error)
          return { metricColumn, result: null }
        }
      })

      const results = await Promise.all(metricPromises)
      
      // Update users with all metric data
      setUsers(prev => prev.map(user => {
        const updatedUser = { ...user }
        
        results.forEach(({ metricColumn, result }) => {
          if (result?.userMetrics) {
            const userMetric = result.userMetrics.find((um: any) => um.userId === user.id)
            updatedUser[metricColumn.id] = userMetric?.value || 0
            // Also store display value if available
            if (userMetric?.displayValue) {
              updatedUser[`${metricColumn.id}_display`] = userMetric.displayValue
            }
          } else {
            updatedUser[metricColumn.id] = 0
          }
        })
        
        return updatedUser
      }))

    } catch (error) {
      console.error('Error loading metric data:', error)
      toast({
        title: "Error",
        description: "Failed to load some metric data",
        variant: "destructive",
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  // Define base columns
  const baseColumns: ColumnDef<UserMetric>[] = [
        {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-1 text-xs font-medium leading-tight"
          >
            Name
            <ArrowUpDown className="ml-0.5 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium text-sm truncate">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: () => <div className="text-xs font-medium">Email</div>,
      cell: ({ row }) => <div className="text-muted-foreground text-sm truncate">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "role",
      header: () => <div className="text-xs font-medium">Role</div>,
      cell: ({ row }) => {
        const role = row.getValue("role") as string
        return (
          <div className="capitalize text-sm">
            {role === 'setter' ? 'Setter' : 'Rep'}
          </div>
        )
      },
    },
  ]

  // Combine base columns with dynamic metric columns from table config
  const columns = useMemo(() => {
    if (!tableConfig?.columns) return baseColumns
    
    // Add dynamic columns based on table configuration
    // Skip columns that are already in baseColumns (name, email, role)
    const baseColumnIds = baseColumns.map(col => (col as any).accessorKey).filter(Boolean)
    const dynamicColumns = tableConfig.columns
      .filter((col: any) => !baseColumnIds.includes(col.field))
      .map((col: any) => ({
        accessorKey: col.field,
        header: ({ column }: any) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center group relative min-w-0">
                    <Button
                      variant="ghost"
                      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                      className="h-auto p-2 text-xs font-medium leading-tight whitespace-nowrap rounded-full transition-all duration-200 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <span className="truncate max-w-[60px]">{col.header}</span>
                      <ArrowUpDown className="ml-0.5 h-3 w-3 flex-shrink-0" />
                    </Button>
                  </div>
                </TooltipTrigger>
                {col.metricName && (
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <div className="font-medium">{col.header}</div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveColumn(col.id)}
                        className="w-full h-6 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove Column
                      </Button>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        },
        cell: ({ row }: any) => {
          const value = row.getValue(col.field)
          const displayValue = row.original[`${col.field}_display`]
          
          // Use display value if available, otherwise format based on column type
          if (displayValue) {
            return <div className="text-center text-sm font-medium">{displayValue}</div>
          }
          
          // Format based on column type
          if (col.type === 'number') {
            const numValue = Number(value || 0)
            const formattedValue = numValue.toLocaleString('en-US')
            return <div className="text-center text-sm font-medium">{formattedValue}</div>
          }
          if (col.type === 'percentage') {
            const numValue = Number(value || 0)
            // Convert decimal to percentage (e.g., 0.25 -> 25.0%)
            const percentValue = (numValue * 100).toFixed(1)
            return <div className="text-center text-sm font-medium">{percentValue}%</div>
          }
          if (col.type === 'currency') {
            const numValue = Number(value || 0)
            const formattedValue = numValue.toLocaleString('en-US', { 
              style: 'currency', 
              currency: 'USD', 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })
            return <div className="text-center text-sm font-medium">{formattedValue}</div>
          }
          return <div className="text-center text-sm">{value || '-'}</div>
        },
      }))

    return [...baseColumns, ...dynamicColumns]
  }, [tableConfig])

  const handleAddColumn = () => {
    setIsMetricModalOpen(true)
  }

  const handleMetricSelect = async (metricName: string, metricDefinition: MetricDefinition) => {
    if (!selectedAccountId || !currentTableId) return

    // Check if metric is already added
    if (metricColumns.some(col => col.metricName === metricName)) {
      toast({
        title: "Metric already added",
        description: `${metricDefinition.name} is already in this table`,
        variant: "destructive",
      })
      return
    }

    const newColumn: MetricColumn = {
      id: `metric_${metricName}_${Date.now()}`,
      metricName,
      displayName: metricDefinition.name,
      unit: metricDefinition.unit
    }

    // Add to local state
    setMetricColumns(prev => [...prev, newColumn])

    // Update table configuration in database
    try {
      const updatedColumns = [...(tableConfig?.columns || []), {
        id: newColumn.id,
        field: newColumn.id,
        header: newColumn.displayName,
        type: getColumnType(newColumn.unit),
        metricName: newColumn.metricName,
        unit: newColumn.unit
      }]

      const { error } = await supabase
        .from('data_tables')
        .update({ 
          columns: updatedColumns,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentTableId)

      if (error) throw error

      setTableConfig((prev: any) => ({ ...prev, columns: updatedColumns }))
      
      // Load metric data for users
      await loadMetricData(newColumn)

      toast({
        title: "Column added",
        description: `${metricDefinition.name} has been added to the table`,
      })

    } catch (error) {
      console.error('Error adding metric column:', error)
      setMetricColumns(prev => prev.filter(col => col.id !== newColumn.id))
      toast({
        title: "Error",
        description: "Failed to add metric column",
        variant: "destructive",
      })
    }
  }

  const handleRemoveColumn = async (columnId: string) => {
    if (!currentTableId) return

    try {
      const updatedColumns = (tableConfig?.columns || []).filter((col: any) => col.id !== columnId)
      
      const { error } = await supabase
        .from('data_tables')
        .update({ 
          columns: updatedColumns,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentTableId)

      if (error) throw error

      setTableConfig((prev: any) => ({ ...prev, columns: updatedColumns }))
      setMetricColumns(prev => prev.filter(col => col.id !== columnId))
      
      // Remove metric data from users
      setUsers(prev => prev.map(user => {
        const { [columnId]: removed, ...rest } = user
        return rest as UserMetric
      }))

      toast({
        title: "Column removed",
        description: "Metric column has been removed from the table",
      })

    } catch (error) {
      console.error('Error removing metric column:', error)
      toast({
        title: "Error",
        description: "Failed to remove metric column",
        variant: "destructive",
      })
    }
  }

  const getColumnType = (unit?: string) => {
    switch (unit) {
      case 'currency':
        return 'currency'
      case 'percent':
        return 'percentage'
      case 'count':
        return 'number'
      default:
        return 'text'
    }
  }

  const loadMetricData = async (metricColumn: MetricColumn) => {
    if (!selectedAccountId || users.length === 0) {
      console.log('loadMetricData: Missing data', { selectedAccountId, usersLength: users.length })
      return
    }

    console.log('loadMetricData: Starting for metric', metricColumn.metricName, 'with users:', users.length)
    setMetricsLoading(true)
    try {
      const userIds = users.map(user => user.id)
      
      console.log('loadMetricData: Making API call with', { 
        accountId: selectedAccountId, 
        userIds, 
        metricName: metricColumn.metricName, 
        dateRange, 
        roleFilter 
      })
      
      const response = await fetch('/api/data-view/user-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          userIds,
          metricName: metricColumn.metricName,
          dateRange: dateRange,
          roleFilter
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('loadMetricData: API error', response.status, errorText)
        console.error('loadMetricData: Request was:', { 
          accountId: selectedAccountId, 
          userIds, 
          metricName: metricColumn.metricName, 
          dateRange, 
          roleFilter 
        })
        throw new Error(`Failed to load ${metricColumn.displayName}: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('loadMetricData: API result', result)
      
      // Update users with metric data
      setUsers(prev => prev.map(user => {
        const userMetric = result.userMetrics.find((um: any) => um.userId === user.id)
        const value = userMetric?.value || 0
        console.log(`loadMetricData: Setting ${metricColumn.id} = ${value} for user ${user.name}`)
        return {
          ...user,
          [metricColumn.id]: value
        }
      }))

    } catch (error) {
      console.error('Error loading metric data:', error)
      toast({
        title: "Error",
        description: "Failed to load metric data",
        variant: "destructive",
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  const createDefaultTable = async () => {
    if (!selectedAccountId) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data, error } = await supabase
        .from('data_tables')
        .insert({
          account_id: selectedAccountId,
          name: 'User Metrics',
          description: 'Default table for viewing user performance metrics',
          columns: [
            // Base columns (name, email, role) are now handled by baseColumns
            // Only store metric/custom columns in the table configuration
          ],
          filters: { roles: [] },
          is_default: true,
          created_by: userData.user.id
        })
        .select()
        .single()

      if (error) throw error

      // Trigger the table change event to select the new table
      window.dispatchEvent(new CustomEvent('tableChanged', { detail: { tableId: data.id } }))
      
      toast({
        title: "Table created",
        description: "Default table created successfully",
      })

    } catch (error) {
      console.error('Error creating default table:', error)
      toast({
        title: "Error",
        description: "Failed to create default table",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16">
        {/* Data table */}
        <div className="p-6">
          {currentTableId ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">{tableConfig?.name || 'Data Table'}</h1>
                  {tableConfig?.description && (
                    <p className="text-muted-foreground mt-1">{tableConfig.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{users.length} users</span>
                  {metricColumns.length > 0 && (
                    <span>• {metricColumns.length} metrics</span>
                  )}
                </div>
              </div>
              
              <UserMetricsTable
                data={users}
                columns={columns}
                onAddColumn={handleAddColumn}
                onRemoveColumn={handleRemoveColumn}
                loading={metricsLoading}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              {selectedAccountId ? (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No table selected</h3>
                    <p>Create or select a table to view user metrics data</p>
                  </div>
                  <Button onClick={createDefaultTable} variant="outline">
                    Create Default Table
                  </Button>
                </>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Select an account first</h3>
                  <p>Choose an account from the dropdown to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <MetricSelectionModal
        open={isMetricModalOpen}
        onOpenChange={setIsMetricModalOpen}
        onMetricSelect={handleMetricSelect}
      />
    </div>
  )
} 