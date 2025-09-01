"use client";

import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Star,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EnhancedDataTableProps {
  data?: any[];
  columns?: ColumnDef<any>[];
  isLoading?: boolean;
  error?: string;
  onRowClick?: (row: any) => void;
  className?: string;
}

export function EnhancedDataTable({
  data = [],
  columns = [],
  isLoading = false,
  error,
  onRowClick,
  className
}: EnhancedDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // Default columns if none provided
  const defaultColumns: ColumnDef<any>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {row.original.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <p className="font-medium">{row.original.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge 
          variant={row.original.role === 'closer' ? 'default' : 'secondary'}
          className="capitalize"
        >
          {row.original.role || 'Unknown'}
        </Badge>
      ),
    },
    {
      accessorKey: "appointments",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Appointments
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <p className="font-semibold">{row.original.appointments || 0}</p>
          {row.original.appointmentsTrend && (
            <div className={cn(
              "flex items-center justify-center gap-1 text-xs",
              row.original.appointmentsTrend > 0 ? "text-success" : "text-destructive"
            )}>
              {row.original.appointmentsTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(row.original.appointmentsTrend).toFixed(1)}%
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Revenue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const revenue = row.original.revenue;
        return (
          <div className="text-right">
            {revenue ? (
              <>
                <p className="font-semibold">
                  {new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(revenue)}
                </p>
                {row.original.revenueTrend && (
                  <div className={cn(
                    "flex items-center justify-end gap-1 text-xs",
                    row.original.revenueTrend > 0 ? "text-success" : "text-destructive"
                  )}>
                    {row.original.revenueTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(row.original.revenueTrend).toFixed(1)}%
                  </div>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "closeRate",
      header: "Close Rate",
      cell: ({ row }) => {
        const rate = row.original.closeRate;
        return rate ? (
          <div className="text-center">
            <p className="font-semibold">{(rate * 100).toFixed(1)}%</p>
            <div className={cn(
              "w-full bg-muted rounded-full h-1.5 mt-1",
            )}>
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${rate * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "leadQuality",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <Star className="mr-2 h-4 w-4" />
          Quality
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const quality = row.original.leadQuality;
        if (!quality) return <span className="text-muted-foreground">-</span>;
        
        const getQualityColor = (score: number) => {
          if (score >= 8.5) return "text-success";
          if (score >= 7.0) return "text-warning";
          return "text-destructive";
        };

        return (
          <div className="text-center">
            <p className={cn("font-semibold", getQualityColor(quality))}>
              {quality.toFixed(1)}
            </p>
            <div className="flex justify-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5",
                    i < Math.floor(quality / 2) ? "text-yellow-400 fill-current" : "text-muted"
                  )}
                />
              ))}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "responseTime",
      header: "Speed",
      cell: ({ row }) => {
        const time = row.original.responseTime;
        if (!time) return <span className="text-muted-foreground">-</span>;
        
        const getSpeedColor = (seconds: number) => {
          if (seconds <= 60) return "text-success";
          if (seconds <= 180) return "text-warning";
          return "text-destructive";
        };

        const formatTime = (seconds: number) => {
          if (seconds < 60) return `${seconds}s`;
          return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        };

        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={cn("font-semibold text-sm", getSpeedColor(time))}>
                {formatTime(time)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.original.source;
        const sourceColors = {
          'Facebook': 'bg-blue-100 text-blue-800',
          'Google': 'bg-green-100 text-green-800',
          'LinkedIn': 'bg-blue-100 text-blue-800',
          'Direct': 'bg-gray-100 text-gray-800',
          'Referral': 'bg-purple-100 text-purple-800'
        };

        return source ? (
          <Badge 
            variant="outline" 
            className={cn("text-xs", sourceColors[source as keyof typeof sourceColors] || "bg-gray-100 text-gray-800")}
          >
            {source}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <MapPin className="mr-2 h-4 w-4" />
              View Journey
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ], []);

  const table = useReactTable({
    data,
    columns: columns.length > 0 ? columns : defaultColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  if (error) {
    return (
      <div className="enhanced-table">
        <div className="flex items-center justify-center h-64 fade-in">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Error loading data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("enhanced-table", className)}>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="bg-muted/50 font-semibold text-muted-foreground border-r last:border-r-0"
                  >
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
            {isLoading ? (
              // Loading skeleton rows
              [...Array(8)].map((_, index) => (
                <TableRow key={`loading-${index}`} className="hover:bg-transparent">
                  {table.getAllColumns().map((column, colIndex) => (
                    <TableCell key={`loading-${index}-${colIndex}`} className="border-r last:border-r-0">
                      <div className="skeleton h-4 w-full rounded" style={{ animationDelay: `${index * 50 + colIndex * 20}ms` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b transition-all duration-200 cursor-pointer hover:bg-accent/50",
                    row.getIsSelected() && "bg-primary/5"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className="border-r last:border-r-0 py-3"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-64 text-center"
                >
                  <div className="space-y-3 fade-in">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                      <Database className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No data available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your filters or date range
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Enhanced Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )}{" "}
              of {data.length} results
            </p>
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {table.getFilteredSelectedRowModel().rows.length} selected
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 