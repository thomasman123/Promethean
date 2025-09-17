"use client"

import { useState, useEffect, useMemo } from "react"
import { TopBar } from "@/components/layout/topbar"
import { UserMetricsTable, type UserMetric, type MetricColumn } from "@/components/data-view/user-metrics-table"
import { AccountMetricsTable, type AccountMetric, type AccountMetricColumn } from "@/components/data-view/account-metrics-table"
import { UnifiedMetricSelector } from "@/components/shared/unified-metric-selector"
import { TableTypeSelector } from "@/components/data-view/table-type-selector"
import { useDashboard } from "@/lib/dashboard-context"
import { createBrowserClient } from "@supabase/ssr"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Trash2, Building, TrendingUp } from "lucide-react"
import { addDays, addWeeks, addMonths, format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const [isTableTypeSelectorOpen, setIsTableTypeSelectorOpen] = useState(false)
  const [metricColumns, setMetricColumns] = useState<MetricColumn[]>([])
  const [accountMetrics, setAccountMetrics] = useState<AccountMetric[]>([])
  const [accountMetricsColumns, setAccountMetricsColumns] = useState<ColumnDef<AccountMetric>[]>([])
  const [periodView, setPeriodView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
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

  // Load account metrics when period view or date range changes
  useEffect(() => {
    if (metricColumns.length > 0 && tableConfig?.table_type === 'account_metrics' && dateRange.from && dateRange.to) {
      console.log('🔄 Reloading account metrics due to period/date change:', { 
        periodView, 
        metricColumns: metricColumns.length,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        }
      })
      loadAllAccountMetrics(metricColumns)
    }
  }, [periodView, dateRange.from, dateRange.to, metricColumns.length, tableConfig?.table_type])

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
          if (roleFilter === 'setter') return user.accountRole === 'setter'
          if (roleFilter === 'rep') return ['sales_rep', 'moderator', 'admin'].includes(user.accountRole)
          return false
        })
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Use the functional role from API (setter/rep/inactive)
          accountRole: user.accountRole, // Store account role for reference
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
    
    console.log('📊 Loaded table config:', { 
      name: data.name, 
      tableType: data.table_type || 'user_metrics',
      columnsCount: data.columns?.length || 0
    })
    
    // Extract metric columns from table configuration
    const columns = data.columns || []
    const metricCols = columns
      .filter((col: any) => col.metricName) // Only columns with metric data
      .map((col: any) => ({
        id: col.id,
        metricName: col.metricName,
        displayName: col.header,
        unit: col.unit,
        options: col.options
      }))
    
    setMetricColumns(metricCols)
    
    // Load data based on table type
    const tableType = data.table_type || 'user_metrics'
    
    if (tableType === 'user_metrics') {
      // Load metric data for existing metric columns (current functionality)
      if (metricCols.length > 0 && users.length > 0) {
        await loadAllMetricData(metricCols)
      }
    } else if (tableType === 'account_metrics') {
      // Load account-level metrics
      if (metricCols.length > 0) {
        await loadAllAccountMetrics(metricCols)
      }
    } else if (tableType === 'time_series') {
      // TODO: Load time series data
      console.log('📊 Time series table - will implement time-based data loading')
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

  const loadAllAccountMetrics = async (metricCols: MetricColumn[]) => {
    if (!selectedAccountId) return

    setMetricsLoading(true)
    console.log('🔄 Loading account metrics with period view:', { 
      metricColumns: metricCols.length, 
      dateRange,
      periodView
    })

    try {
      // Get raw daily data from metrics API (same as dashboard)
      const metricsData = await Promise.all(
        metricCols.map(async (col) => {
          try {
            const response = await fetch('/api/metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metricName: col.metricName,
                filters: {
                  accountId: selectedAccountId,
                  dateRange: {
                    start: format(dateRange.from, 'yyyy-MM-dd'),
                    end: format(dateRange.to, 'yyyy-MM-dd')
                  }
                },
                options: {
                  vizType: 'line', // Get time series data
                  widgetSettings: col.options
                }
              })
            })

            if (response.ok) {
              const result = await response.json()
              if (result.result?.type === 'time' && result.result.data) {
                return { metric: col.displayName, data: result.result.data, metricId: col.id }
              }
            }
            
            console.error('Failed to load time series for:', col.metricName)
            return { metric: col.displayName, data: [], metricId: col.id }
            
          } catch (error) {
            console.error('Error loading metric time series:', col.metricName, error)
            return { metric: col.displayName, data: [], metricId: col.id }
          }
        })
      )

      // Aggregate raw data based on selected period view
      const aggregatedData = aggregateMetricsData(metricsData, periodView)
      setAccountMetrics(aggregatedData)
      console.log('✅ Account metrics loaded and aggregated:', aggregatedData.length, 'periods')

    } catch (error) {
      console.error('Error loading account metrics:', error)
      toast({
        title: "Error",
        description: "Failed to load account metrics",
        variant: "destructive",
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  // Aggregate raw daily data into the selected period view
  const aggregateMetricsData = (metricsData: any[], periodView: 'daily' | 'weekly' | 'monthly') => {
    if (metricsData.length === 0) return []

    // Get all unique dates from all metrics
    const allDates = new Set<string>()
    metricsData.forEach(({ data }) => {
      data.forEach((d: any) => allDates.add(d.date))
    })
    
    const sortedDates = Array.from(allDates).sort()
    if (sortedDates.length === 0) return []

    // Create date periods based on view
    const periods: Array<{ key: string; label: string; dates: string[] }> = []
    
    if (periodView === 'daily') {
      // Each date is its own period
      sortedDates.forEach(date => {
        periods.push({
          key: date,
          label: format(new Date(date), 'MMM d'),
          dates: [date]
        })
      })
    } else if (periodView === 'weekly') {
      // Group dates by week (Monday start to match database)
      const weekGroups = new Map<string, string[]>()
      
      sortedDates.forEach(date => {
        const dateObj = new Date(date)
        // Use Monday as week start to match PostgreSQL's DATE_TRUNC('week')
        const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 })
        const weekKey = format(weekStart, 'yyyy-MM-dd')
        
        if (!weekGroups.has(weekKey)) {
          weekGroups.set(weekKey, [])
        }
        weekGroups.get(weekKey)!.push(date)
      })
      
      Array.from(weekGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([weekKey, dates]) => {
          periods.push({
            key: weekKey,
            label: `Week of ${format(new Date(weekKey), 'MMM d')}`,
            dates
          })
        })
    } else {
      // Group dates by month
      const monthGroups = new Map<string, string[]>()
      
      sortedDates.forEach(date => {
        const dateObj = new Date(date)
        const monthStart = startOfMonth(dateObj)
        const monthKey = format(monthStart, 'yyyy-MM-dd')
        
        if (!monthGroups.has(monthKey)) {
          monthGroups.set(monthKey, [])
        }
        monthGroups.get(monthKey)!.push(date)
      })
      
      Array.from(monthGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([monthKey, dates]) => {
          periods.push({
            key: monthKey,
            label: format(new Date(monthKey), 'MMM yyyy'),
            dates
          })
        })
    }

    // Aggregate data for each period
    return periods.map(period => {
      const dataPoint: AccountMetric = {
        period: period.label
      }

      metricsData.forEach(({ metricId, data }) => {
        // Sum values for all dates in this period
        const totalValue = period.dates.reduce((sum, date) => {
          const dayData = data.find((d: any) => d.date === date)
          return sum + (dayData?.value || 0)
        }, 0)
        
        dataPoint[metricId] = totalValue
      })

      return dataPoint
    })
  }

  const loadAccountMetricData = async (metricColumn: MetricColumn) => {
    if (!selectedAccountId) return

    console.log('🔄 Loading single account metric:', metricColumn.metricName)
    
    try {
      // Get raw time series data
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricName: metricColumn.metricName,
          filters: {
            accountId: selectedAccountId,
            dateRange: {
              start: format(dateRange.from, 'yyyy-MM-dd'),
              end: format(dateRange.to, 'yyyy-MM-dd')
            }
          },
          options: {
            vizType: 'line', // Get time series data
            widgetSettings: metricColumn.options
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to load ${metricColumn.displayName}`)
      }

      const result = await response.json()
      console.log('✅ Account metric time series loaded:', result)

      if (result.result?.type === 'time' && result.result.data) {
        // Aggregate this single metric with existing data
        const metricsData = [{ metricId: metricColumn.id, data: result.result.data }]
        const aggregatedData = aggregateMetricsData(metricsData, periodView)
        
        // Merge with existing account metrics
        setAccountMetrics(prev => {
          if (prev.length === 0) {
            return aggregatedData
          }
          
          // Update existing periods with new metric data
          return prev.map(row => {
            const newData = aggregatedData.find(d => d.period === row.period)
            return {
              ...row,
              [metricColumn.id]: newData?.[metricColumn.id] || 0
            }
          })
        })
      }

      // Update columns for table display
      setAccountMetricsColumns(prev => {
        const hasColumn = prev.some(col => (col as any).accessorKey === metricColumn.id)
        if (hasColumn) return prev

        const newColumn: ColumnDef<AccountMetric> = {
          accessorKey: metricColumn.id,
          header: ({ column }) => (
            <div className="flex items-center gap-2">
              <span>{metricColumn.displayName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveColumn(metricColumn.id)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ),
          cell: ({ getValue }) => {
            const value = getValue() as string | number
            return <span className="font-medium">{value || '0'}</span>
          },
        }

        return [...prev, newColumn]
      })

    } catch (error) {
      console.error('❌ Error loading account metric:', error)
      toast({
        title: "Error",
        description: `Failed to load ${metricColumn.displayName}`,
        variant: "destructive",
      })
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
      .filter((col: any) => {
        // More thorough filtering
        const isValid = col && 
                       col.field && 
                       col.header && 
                       col.field.trim() !== '' && 
                       col.header.trim() !== '' &&
                       !baseColumnIds.includes(col.field)
        
        if (!isValid) {
          console.log('🚫 Filtered out invalid column:', col)
        }
        
        return isValid
      })
      .map((col: any) => ({
        accessorKey: col.field,
        header: ({ column }: any) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center group relative min-w-0">
                    <Button
                      variant="outline"
                      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                      className="h-auto p-2 text-xs font-medium leading-tight whitespace-nowrap rounded-full transition-all duration-200 border-0 bg-transparent hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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

    const finalColumns = [...baseColumns, ...dynamicColumns]
    
    // Debug: Log column information
    console.log('🔍 Column Debug:', {
      baseColumns: baseColumns.length,
      dynamicColumns: dynamicColumns.length,
      totalColumns: finalColumns.length,
      columnIds: finalColumns.map(col => (col as any).accessorKey || 'unknown'),
      tableConfigColumns: tableConfig?.columns?.length || 0,
      detailedColumns: finalColumns.map(col => ({
        accessorKey: (col as any).accessorKey,
        header: typeof (col as any).header === 'function' ? 'function' : (col as any).header
      }))
    })
    
    return finalColumns
  }, [tableConfig])

  const handleAddColumn = () => {
    setIsMetricModalOpen(true)
  }

  const handleMetricSelect = async (metricName: string, metricDefinition: MetricDefinition, options?: any) => {
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

    // Create display name with options info
    let displayName = metricDefinition.name
    if (options) {
      const optionParts = []
      if (options.attribution && options.attribution !== 'all') {
        optionParts.push(options.attribution)
      }
      if (options.timeFormat && options.timeFormat !== 'seconds') {
        optionParts.push(options.timeFormat)
      }
      if (options.calculation && options.calculation !== 'average') {
        optionParts.push(options.calculation)
      }
      if (optionParts.length > 0) {
        displayName += ` (${optionParts.join(', ')})`
      }
    }

    const newColumn: MetricColumn = {
      id: `metric_${metricName}_${Date.now()}`,
      metricName,
      displayName,
      unit: metricDefinition.unit,
      options // Store the options for later use
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
        unit: newColumn.unit,
        options: newColumn.options
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
      
      // Load metric data based on table type
      if (tableConfig?.table_type === 'account_metrics') {
        await loadAccountMetricData(newColumn)
      } else {
        // Default to user metrics
        await loadMetricData(newColumn)
      }

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
        roleFilter,
        options: metricColumn.options
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
          dateRange: {
            start: format(dateRange.from, 'yyyy-MM-dd'),
            end: format(dateRange.to, 'yyyy-MM-dd')
          },
          roleFilter,
          options: metricColumn.options
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
      console.log('loadMetricData: Sample userMetric:', result.userMetrics?.[0])
      
      // Update users with metric data
      setUsers(prev => prev.map(user => {
        const userMetric = result.userMetrics.find((um: any) => um.userId === user.id)
        const value = userMetric?.value || 0
        const displayValue = userMetric?.displayValue || value
        console.log(`loadMetricData: Setting ${metricColumn.id} = ${displayValue} (raw: ${value}) for user ${user.name}`)
        return {
          ...user,
          [metricColumn.id]: displayValue
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

  const handleCreateTable = async (tableConfig: {
    name: string
    description: string
    tableType: 'user_metrics' | 'account_metrics' | 'time_series'
  }) => {
    if (!selectedAccountId) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      console.log('🔄 Creating table with config:', tableConfig)

      const { data, error } = await supabase
        .from('data_tables')
        .insert({
          account_id: selectedAccountId,
          name: tableConfig.name,
          description: tableConfig.description || null,
          table_type: tableConfig.tableType,
          columns: [], // Start with empty columns, user will add metrics
          filters: { roles: [] },
          is_default: false,
          created_by: userData.user.id
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Table created:', data)

      // Trigger the table change event to select the new table
      window.dispatchEvent(new CustomEvent('tableChanged', { detail: { tableId: data.id } }))
      
      toast({
        title: "Table created",
        description: `${tableConfig.name} created successfully`,
      })

    } catch (error) {
      console.error('❌ Error creating table:', error)
      toast({
        title: "Error",
        description: "Failed to create table",
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold">{tableConfig?.name || 'Data Table'}</h1>
                    {tableConfig?.table_type && (
                      <Badge variant="outline" className="text-xs">
                        {tableConfig.table_type === 'user_metrics' ? 'User Performance' :
                         tableConfig.table_type === 'account_metrics' ? 'Account Metrics' :
                         tableConfig.table_type === 'time_series' ? 'Time Series' : 
                         tableConfig.table_type}
                      </Badge>
                    )}
                  </div>
                  {tableConfig?.description && (
                    <p className="text-muted-foreground mt-1">{tableConfig.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {tableConfig?.table_type === 'user_metrics' ? (
                    <>
                      <span>{users.length} users</span>
                      {metricColumns.length > 0 && (
                        <span>• {metricColumns.length} metrics</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>{tableConfig?.table_type === 'account_metrics' ? 'Account Level' : 'Time Series'}</span>
                      {metricColumns.length > 0 && (
                        <span>• {metricColumns.length} metrics</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Render different table types */}
              {tableConfig?.table_type === 'user_metrics' ? (
                <UserMetricsTable
                  data={users}
                  columns={columns}
                  onAddColumn={handleAddColumn}
                  onRemoveColumn={handleRemoveColumn}
                  loading={metricsLoading}
                />
              ) : tableConfig?.table_type === 'account_metrics' ? (
                <div className="space-y-4">
                  {/* Period View Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Period View:</span>
                    <div className="flex items-center bg-muted rounded-md p-1">
                      <Button
                        variant={periodView === 'daily' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setPeriodView('daily')
                          if (metricColumns.length > 0) {
                            loadAllAccountMetrics(metricColumns)
                          }
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Daily
                      </Button>
                      <Button
                        variant={periodView === 'weekly' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setPeriodView('weekly')
                          if (metricColumns.length > 0) {
                            loadAllAccountMetrics(metricColumns)
                          }
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Weekly
                      </Button>
                      <Button
                        variant={periodView === 'monthly' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setPeriodView('monthly')
                          if (metricColumns.length > 0) {
                            loadAllAccountMetrics(metricColumns)
                          }
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Monthly
                      </Button>
                    </div>
                  </div>

                  <AccountMetricsTable
                    data={accountMetrics}
                    columns={[
                      {
                        accessorKey: "period",
                        header: "Period",
                        cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
                      },
                      ...accountMetricsColumns
                    ]}
                    onAddColumn={handleAddColumn}
                    onRemoveColumn={handleRemoveColumn}
                    loading={metricsLoading}
                  />
                </div>
              ) : tableConfig?.table_type === 'time_series' ? (
                <div className="border rounded-lg p-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Time Series Table</h3>
                  <p className="text-muted-foreground mb-4">
                    This table will show metrics over time periods (daily, weekly, monthly).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Time series implementation coming soon...
                  </p>
                </div>
              ) : (
                <UserMetricsTable
                  data={users}
                  columns={columns}
                  onAddColumn={handleAddColumn}
                  onRemoveColumn={handleRemoveColumn}
                  loading={metricsLoading}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              {selectedAccountId ? (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No table selected</h3>
                    <p>Create or select a table to view user metrics data</p>
                  </div>
                  <Button onClick={() => setIsTableTypeSelectorOpen(true)} variant="outline">
                    Create Table
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

                    <UnifiedMetricSelector
         open={isMetricModalOpen}
         onOpenChange={setIsMetricModalOpen}
         onMetricSelect={handleMetricSelect}
         mode="data-view"
         tableType={tableConfig?.table_type as any}
       />

       {/* Table Type Selector */}
       <TableTypeSelector
         open={isTableTypeSelectorOpen}
         onOpenChange={setIsTableTypeSelectorOpen}
         onCreateTable={handleCreateTable}
       />
     </div>
   )
 } 