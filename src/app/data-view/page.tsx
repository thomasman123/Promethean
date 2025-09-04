"use client"

import { useState, useEffect, useMemo } from "react"
import { TopBar } from "@/components/layout/topbar"
import { TablesManager } from "@/components/data-view/tables-manager"
import { RoleFilterDropdown, type RoleFilter } from "@/components/data-view/role-filter"
import { UserMetricsTable, type UserMetric } from "@/components/data-view/user-metrics-table"
import { useDashboard } from "@/lib/dashboard-context"
import { supabase } from "@/lib/supabase"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DataViewPage() {
  const { selectedAccountId } = useDashboard()
  const [currentTableId, setCurrentTableId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('both')
  const [users, setUsers] = useState<UserMetric[]>([])
  const [tableConfig, setTableConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Load users based on role filter
  useEffect(() => {
    if (!selectedAccountId) return
    loadUsers()
  }, [selectedAccountId, roleFilter])

  // Load table configuration
  useEffect(() => {
    if (!currentTableId) return
    loadTableConfig()
  }, [currentTableId])

  async function loadUsers() {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('account_id', selectedAccountId)
      .order('name')

    // Apply role filter
    if (roleFilter === 'setter') {
      query = query.eq('role', 'setter')
    } else if (roleFilter === 'rep') {
      query = query.eq('role', 'rep')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading users:', error)
      setLoading(false)
      return
    }

    // Transform users to UserMetric format
    const userMetrics: UserMetric[] = (data || []).map(user => ({
      id: user.user_id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role as 'setter' | 'rep',
      // Add more metrics here as needed
    }))

    setUsers(userMetrics)
    setLoading(false)
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
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string
        return (
          <div className="capitalize">
            {role === 'setter' ? 'Appointment Setter' : 'Sales Rep'}
          </div>
        )
      },
    },
  ]

  // Combine base columns with dynamic metric columns from table config
  const columns = useMemo(() => {
    if (!tableConfig?.columns) return baseColumns
    
    // Add dynamic columns based on table configuration
    const dynamicColumns = tableConfig.columns
      .filter((col: any) => col.id !== 'name') // Don't duplicate name column
      .map((col: any) => ({
        accessorKey: col.field,
        header: col.header,
        cell: ({ row }: any) => {
          const value = row.getValue(col.field)
          // Format based on column type
          if (col.type === 'number') {
            return <div className="text-right font-medium">{value || 0}</div>
          }
          if (col.type === 'percentage') {
            return <div className="text-right font-medium">{value || 0}%</div>
          }
          if (col.type === 'currency') {
            return <div className="text-right font-medium">${value || 0}</div>
          }
          return <div>{value || '-'}</div>
        },
      }))

    return [...baseColumns, ...dynamicColumns]
  }, [tableConfig])

  const handleAddColumn = () => {
    // TODO: Implement column selection dialog
    console.log('Add column clicked')
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16">
        {/* Top bar with dropdowns */}
        <div className="border-b">
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-lg font-semibold">Data View</h1>
            <div className="flex items-center gap-2">
              {selectedAccountId && (
                <>
                  <RoleFilterDropdown
                    value={roleFilter}
                    onChange={setRoleFilter}
                  />
                  <TablesManager
                    accountId={selectedAccountId}
                    currentTableId={currentTableId}
                    onTableChange={setCurrentTableId}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Data table */}
        <div className="p-6">
          {currentTableId ? (
            <UserMetricsTable
              data={users}
              columns={columns}
              onAddColumn={handleAddColumn}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {selectedAccountId ? 'Select a table to view data' : 'Select an account first'}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 