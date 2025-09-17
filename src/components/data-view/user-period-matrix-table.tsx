"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Plus, X, Users, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface UserPeriodMetric {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  periods: Array<{
    periodKey: string
    periodLabel: string
    value: number
    displayValue: string
  }>
  total: {
    value: number
    displayValue: string
  }
  [key: string]: any // Dynamic metric columns
}

export interface Period {
  key: string
  label: string
}

export interface MetricColumn {
  id: string
  metricName: string
  displayName: string
  unit?: 'count' | 'currency' | 'percent' | 'seconds' | 'days'
  options?: any
}

interface UserPeriodMatrixTableProps {
  data: UserPeriodMetric[]
  periods: Period[]
  metricColumns: MetricColumn[]
  onAddColumn?: (metric: MetricColumn) => void
  onRemoveColumn?: (columnId: string) => void
  loading?: boolean
  periodView: 'daily' | 'weekly' | 'monthly'
}

export function UserPeriodMatrixTable({ 
  data, 
  periods, 
  metricColumns, 
  onAddColumn, 
  onRemoveColumn, 
  loading,
  periodView 
}: UserPeriodMatrixTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Build dynamic columns based on current metrics and periods
  const columns: ColumnDef<UserPeriodMetric>[] = React.useMemo(() => {
    const cols: ColumnDef<UserPeriodMetric>[] = []

    // User name column
    cols.push({
      id: "user",
      accessorKey: "userName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 text-left justify-start"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          <div>{row.original.userName}</div>
          <div className="text-xs text-muted-foreground">{row.original.userRole}</div>
        </div>
      ),
    })

    // Period columns
    periods.forEach((period) => {
      cols.push({
        id: period.key,
        header: () => (
          <div className="text-center text-xs">
            {period.label}
          </div>
        ),
        cell: ({ row }) => {
          const periodData = row.original.periods.find(p => p.periodKey === period.key)
          return (
            <div className="text-center text-sm">
              {periodData?.displayValue || '0'}
            </div>
          )
        },
      })
    })

    // Total column
    cols.push({
      id: "total",
      header: () => (
        <div className="text-center font-medium">
          TOTAL
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.original.total.displayValue}
        </div>
      ),
    })

    return cols
  }, [periods])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // Group users by role
  const closerUsers = data.filter(user => 
    user.userRole === 'sales_rep' || user.userRole === 'rep'
  )
  
  const setterUsers = data.filter(user => 
    user.userRole === 'setter'
  )

  // Group metrics by role for section display
  const closerMetrics = metricColumns.filter(col => {
    const isCloserMetric = col.metricName.includes('appointment') || 
                         col.metricName.includes('sales') || 
                         col.metricName.includes('cash') ||
                         col.metricName.includes('show_up') ||
                         col.metricName.includes('close') ||
                         col.metricName.includes('revenue') ||
                         col.metricName.includes('booking_to_close') ||
                         col.metricName.includes('pitch')
    return isCloserMetric
  })

  const setterMetrics = metricColumns.filter(col => {
    const isSetterMetric = col.metricName.includes('dial') || 
                         col.metricName.includes('answer') || 
                         col.metricName.includes('booking') ||
                         col.metricName.includes('discovery') ||
                         col.metricName.includes('work') ||
                         col.metricName.includes('speed')
    return isSetterMetric
  })

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter users..."
          value={(table.getColumn("user")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("user")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          {onAddColumn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddColumn({
                id: `metric_${Date.now()}`,
                metricName: '',
                displayName: 'New Metric',
                options: {}
              })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Metric
            </Button>
          )}
        </div>
      </div>

      {/* Single table with all metrics and users */}
      <div className="space-y-6">
        {metricColumns.length > 0 && (
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
                              <Table>
                  <TableHeader>
                    {/* Main header row */}
                    <TableRow>
                      <TableHead className="w-[200px]"></TableHead>
                      {periods.map(period => (
                        <TableHead key={period.key} className="text-center min-w-[80px]">
                          <div className="text-xs">{period.label}</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-medium min-w-[80px]">TOTAL</TableHead>
                      {closerUsers.length > 0 && (
                        <TableHead className="text-center min-w-[100px]" colSpan={closerUsers.length * periods.length}>
                          <div className="text-xs font-medium">CLOSERS</div>
                        </TableHead>
                      )}
                      {setterUsers.length > 0 && (
                        <TableHead className="text-center min-w-[100px]" colSpan={setterUsers.length * periods.length}>
                          <div className="text-xs font-medium">SETTERS</div>
                        </TableHead>
                      )}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                    
                    {/* Sub-header row for individual users */}
                    <TableRow className="bg-muted/30">
                      <TableHead></TableHead>
                      {periods.map(period => (
                        <TableHead key={`team-${period.key}`} className="text-center">
                          <div className="text-xs text-muted-foreground">Team</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">
                        <div className="text-xs text-muted-foreground">Team</div>
                      </TableHead>
                      {closerUsers.map(user => 
                        periods.map(period => (
                          <TableHead key={`${user.userId}-${period.key}`} className="text-center min-w-[60px]">
                            <div className="text-xs">{user.userName}</div>
                            <div className="text-xs text-muted-foreground">{period.label}</div>
                          </TableHead>
                        ))
                      ).flat()}
                      {setterUsers.map(user => 
                        periods.map(period => (
                          <TableHead key={`${user.userId}-${period.key}`} className="text-center min-w-[60px]">
                            <div className="text-xs">{user.userName}</div>
                            <div className="text-xs text-muted-foreground">{period.label}</div>
                          </TableHead>
                        ))
                      ).flat()}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {/* CLOSERS section header */}
                  {closerMetrics.length > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={periods.length + 3 + data.length} className="font-bold text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          CLOSERS
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Closer metrics */}
                  {closerMetrics.map((metricCol) => (
                    <TableRow key={metricCol.id}>
                      <TableCell className="font-medium">
                        {metricCol.displayName}
                      </TableCell>
                      {periods.map(period => {
                        // Calculate total for this period across all closer users
                        const periodTotal = closerUsers.reduce((sum, user) => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return sum + (userPeriodData?.value || 0)
                        }, 0)
                        
                        return (
                          <TableCell key={period.key} className="text-center">
                            {periodTotal}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center font-medium">
                        {closerUsers.reduce((sum, user) => sum + user.total.value, 0)}
                      </TableCell>
                      {closerUsers.map(user => 
                        periods.map(period => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return (
                            <TableCell key={`closer-${user.userId}-${period.key}`} className="text-center">
                              {userPeriodData?.displayValue || '0'}
                            </TableCell>
                          )
                        })
                      ).flat()}
                      {setterUsers.map(user => 
                        periods.map(period => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return (
                            <TableCell key={`setter-${user.userId}-${period.key}`} className="text-center text-muted-foreground">
                              -
                            </TableCell>
                          )
                        })
                      ).flat()}
                      <TableCell>
                        {onRemoveColumn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveColumn(metricCol.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* SETTERS section header */}
                  {setterMetrics.length > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={periods.length + 3 + data.length} className="font-bold text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          SETTERS
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Setter metrics */}
                  {setterMetrics.map((metricCol) => (
                    <TableRow key={metricCol.id}>
                      <TableCell className="font-medium">
                        {metricCol.displayName}
                      </TableCell>
                      {periods.map(period => {
                        // Calculate total for this period across all setter users
                        const periodTotal = setterUsers.reduce((sum, user) => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return sum + (userPeriodData?.value || 0)
                        }, 0)
                        
                        return (
                          <TableCell key={period.key} className="text-center">
                            {periodTotal}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center font-medium">
                        {setterUsers.reduce((sum, user) => sum + user.total.value, 0)}
                      </TableCell>
                      {closerUsers.map(user => 
                        periods.map(period => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return (
                            <TableCell key={`closer-${user.userId}-${period.key}`} className="text-center text-muted-foreground">
                              -
                            </TableCell>
                          )
                        })
                      ).flat()}
                      {setterUsers.map(user => 
                        periods.map(period => {
                          const userPeriodData = user.periods.find(p => p.periodKey === period.key)
                          return (
                            <TableCell key={`setter-${user.userId}-${period.key}`} className="text-center">
                              {userPeriodData?.displayValue || '0'}
                            </TableCell>
                          )
                        })
                      ).flat()}
                      <TableCell>
                        {onRemoveColumn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveColumn(metricCol.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Metric management section */}
        {metricColumns.length > 0 && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Current Metrics</h3>
              {onAddColumn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddColumn({
                    id: `metric_${Date.now()}`,
                    metricName: '',
                    displayName: 'New Metric',
                    options: {}
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {metricColumns.map((metric) => (
                <div key={metric.id} className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-md">
                  <span className="text-sm">{metric.displayName}</span>
                  {onRemoveColumn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveColumn(metric.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {metricColumns.length === 0 && (
          <div className="border rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No Metrics Added</h3>
            <p className="text-muted-foreground mb-4">
              Add metrics to see user performance across time periods.
            </p>
            {onAddColumn && (
              <Button onClick={() => onAddColumn({
                id: `metric_${Date.now()}`,
                metricName: '',
                displayName: 'New Metric',
                options: {}
              })}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Metric
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 