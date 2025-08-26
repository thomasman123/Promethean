"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useDetailedDataStore } from "@/lib/dashboard/detailed-data-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";

interface DataTableProps {
  data?: any[];
  totalCount?: number;
  isLoading?: boolean;
  error?: string;
}

export function DetailedDataTable() {
  const { selectedAccountId } = useAuth();
  const {
    viewMode,
    recordType,
    columns: columnConfigs,
    sortBy,
    setSortBy,
    pageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
    openDrilldown,
    selectRows,
    selectedRows,
    filters,
    groupBy,
  } = useDetailedDataStore();

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when parameters change
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedAccountId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/api/detailed-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: selectedAccountId,
            viewMode,
            recordType,
            groupBy,
            filters,
            sortBy,
            pageSize,
            currentPage,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const result = await response.json();
        setData(result.data || []);
        setTotalCount(result.totalCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedAccountId, viewMode, recordType, groupBy, filters, sortBy, pageSize, currentPage]);

  // Build columns based on view mode and record type
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const baseColumns: ColumnDef<any>[] = [];

    // Selection column
    baseColumns.push({
      id: "select",
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    });

    if (viewMode === "aggregated") {
      // Aggregated columns based on grouping
      baseColumns.push({
        accessorKey: "group",
        header: "Group",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("group")}</div>
        ),
      });

      // KPI columns
      const kpiColumns = [
        { key: "booked", label: "Booked" },
        { key: "shows", label: "Shows" },
        { key: "no_shows", label: "No Shows" },
        { key: "sales_won", label: "Sales (Won)" },
        { key: "sales_lost", label: "Sales (Lost)" },
        { key: "show_rate", label: "Show Rate", format: "percentage" },
        { key: "close_rate", label: "Close Rate", format: "percentage" },
        { key: "revenue", label: "Revenue", format: "currency" },
        { key: "cash_collected", label: "Cash", format: "currency" },
      ];

      kpiColumns.forEach(({ key, label, format }) => {
        baseColumns.push({
          accessorKey: key,
          header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 p-0"
            >
              {label}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          ),
          cell: ({ row }) => {
            const value = row.getValue(key) as number;
            if (format === "percentage") {
              return <span>{(value * 100).toFixed(1)}%</span>;
            } else if (format === "currency") {
              return <span>${value.toLocaleString()}</span>;
            }
            return <span>{value}</span>;
          },
        });
      });
    } else {
      // Raw data columns based on record type
      columnConfigs
        .filter((col) => col.visible)
        .sort((a, b) => a.order - b.order)
        .forEach((config) => {
          baseColumns.push({
            accessorKey: config.id,
            header: ({ column }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-8 p-0"
              >
                {config.id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            ),
            cell: ({ row }) => {
              const value = row.getValue(config.id);
              
              // Special formatting based on column type
              if (config.id.includes("_at") && value) {
                return format(new Date(value as string), "MMM d, yyyy h:mm a");
              }
              
              if (config.id === "status" || config.id === "outcome") {
                return (
                  <Badge variant={value === "completed" ? "default" : "secondary"}>
                    {value as string}
                  </Badge>
                );
              }
              
              if (config.id.includes("amount") || config.id === "revenue") {
                return <span>${(value as number).toLocaleString()}</span>;
              }
              
              return <span>{String(value || "-")}</span>;
            },
          });
        });
    }

    // Actions column
    baseColumns.push({
      id: "actions",
      size: 40,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openDrilldown(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Copy ID</DropdownMenuItem>
            <DropdownMenuItem>Export Row</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return baseColumns;
  }, [viewMode, recordType, columnConfigs, openDrilldown]);

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      sorting: sortBy,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: (updater) => {
      const newState = typeof updater === "function" 
        ? updater(sortBy)
        : updater;
      setSortBy(newState);
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const newState = typeof updater === "function" 
        ? updater({ pageIndex: currentPage - 1, pageSize })
        : updater;
      setCurrentPage(newState.pageIndex + 1);
      setPageSize(newState.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  // Update selected rows in store
  useEffect(() => {
    const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    selectRows(selectedIds);
  }, [rowSelection, selectRows]);

  // Virtualization for performance
  const { rows } = table.getRowModel();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="px-4 pt-4">
        <Input
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="relative">
        <div ref={parentRef} className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        ...(header.column.columnDef.meta as any)?.style,
                      }}
                      className={cn(
                        header.column.getIsPinned() && "sticky bg-background",
                        header.column.getIsPinned() === "left" && "left-0",
                        header.column.getIsPinned() === "right" && "right-0"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : virtualizer.getVirtualItems().length ? (
                virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start - virtualRow.index * virtualRow.size}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.getIsPinned() && "sticky bg-background",
                            cell.column.getIsPinned() === "left" && "left-0",
                            cell.column.getIsPinned() === "right" && "right-0"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected
          </span>
          {totalCount > 0 && (
            <>
              <span className="text-border">•</span>
              <span>{totalCount.toLocaleString()} total records</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 