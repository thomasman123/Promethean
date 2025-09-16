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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Building, TrendingUp } from "lucide-react"

export interface AccountMetric {
  metricName: string
  value: number
  displayValue: string
  unit: string
}

export interface AccountMetricColumn {
  id: string
  metricName: string
  displayName: string
  unit?: 'count' | 'currency' | 'percent' | 'seconds' | 'days'
  options?: any
}

interface AccountMetricsTableProps {
  data: AccountMetric[]
  columns: ColumnDef<AccountMetric>[]
  onAddColumn: () => void
  onRemoveColumn?: (columnId: string) => void
  loading?: boolean
}

export function AccountMetricsTable({ data, columns, onAddColumn, onRemoveColumn, loading }: AccountMetricsTableProps) {
  
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <CardTitle>Account Performance Metrics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onAddColumn} size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading metrics...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No metrics added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add account-level metrics to track overall business performance.
            </p>
            <Button onClick={onAddColumn} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Metric
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account Metrics Display */}
            <div className="grid gap-4">
              {data.map((metric, index) => (
                <div key={metric.metricName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <h4 className="font-medium">{metric.metricName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{metric.displayValue}</span>
                        <Badge variant="outline" className="text-xs">
                          {metric.unit === 'currency' ? '$' :
                           metric.unit === 'percent' ? '%' :
                           metric.unit === 'seconds' ? 's' :
                           metric.unit === 'days' ? 'd' : '#'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {onRemoveColumn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveColumn(`metric_${metric.metricName}_${index}`)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Metrics */}
            <div className="border-t pt-4">
              <Button onClick={onAddColumn} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Metric
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 