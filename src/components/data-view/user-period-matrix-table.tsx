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

      {/* Metrics sections */}
      <div className="space-y-6">
        {/* CLOSERS Section */}
        {closerMetrics.length > 0 && (
          <div className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 font-medium text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              CLOSERS
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    {periods.map(period => (
                      <TableHead key={period.key} className="text-center min-w-[80px]">
                        <div className="text-xs">{period.label}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-medium min-w-[80px]">TOTAL</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closerMetrics.map((metricCol) => (
                    <TableRow key={metricCol.id}>
                      <TableCell className="font-medium">
                        {metricCol.displayName}
                      </TableCell>
                      {periods.map(period => {
                        // Calculate total for this period across all users
                        const periodTotal = data.reduce((sum, user) => {
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
                        {data.reduce((sum, user) => sum + user.total.value, 0)}
                      </TableCell>
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

        {/* SETTERS Section */}
        {setterMetrics.length > 0 && (
          <div className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              SETTERS
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    {periods.map(period => (
                      <TableHead key={period.key} className="text-center min-w-[80px]">
                        <div className="text-xs">{period.label}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-medium min-w-[80px]">TOTAL</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setterMetrics.map((metricCol) => (
                    <TableRow key={metricCol.id}>
                      <TableCell className="font-medium">
                        {metricCol.displayName}
                      </TableCell>
                      {periods.map(period => {
                        // Calculate total for this period across all users
                        const periodTotal = data.reduce((sum, user) => {
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
                        {data.reduce((sum, user) => sum + user.total.value, 0)}
                      </TableCell>
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

        {/* Individual user data */}
        {data.length > 0 && metricColumns.length > 0 && (
          <div className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 font-medium text-sm">
              INDIVIDUAL USERS
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-center">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Loading metrics...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-2 py-1.5">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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