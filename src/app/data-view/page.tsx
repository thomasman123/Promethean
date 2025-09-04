"use client"

import { useState, useEffect, useMemo } from "react"
import { TopBar } from "@/components/layout/topbar"
import { UserMetricsTable, type UserMetric } from "@/components/data-view/user-metrics-table"
import { useDashboard } from "@/lib/dashboard-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DataViewPage() {
  const { selectedAccountId } = useDashboard()
  const [users, setUsers] = useState<UserMetric[]>([])
  const [tableConfig, setTableConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

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

  // Load table configuration
  useEffect(() => {
    if (!currentTableId) return
    loadTableConfig()
  }, [currentTableId])

  async function loadUsers() {
    setLoading(true)
    
    try {
      // First, try using an RPC function if it exists
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_account_users', { p_account_id: selectedAccountId })

      if (!rpcError && rpcData) {
        // Use RPC data
        const userMetrics: UserMetric[] = rpcData
          .filter((user: any) => roleFilter === 'both' || user.role === roleFilter)
          .map((user: any) => ({
            id: user.user_id,
            name: user.full_name || 'Unknown',
            email: user.email || '',
            role: user.role as 'setter' | 'rep',
          }))
        
        setUsers(userMetrics)
        setLoading(false)
        return
      }
    } catch (e) {
      console.log('RPC function not available, falling back to direct query')
    }

    // Fallback: Try direct query with simpler approach
    try {
      // Get current user's account IDs first
      const { data: userAccess } = await supabase
        .from('account_access')
        .select('account_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('account_id', selectedAccountId)
        .single()

      if (!userAccess) {
        console.error('User does not have access to this account')
        setLoading(false)
        return
      }

      // Now get all users for this account
      const { data: accountUsers, error } = await supabase
        .from('account_access')
        .select('user_id')
        .eq('account_id', selectedAccountId)

      if (error) throw error

      // Get profile data for each user
      const userIds = accountUsers?.map(au => au.user_id) || []
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (profileError) throw profileError

      // Transform to UserMetric format
      const userMetrics: UserMetric[] = (profiles || [])
        .filter(profile => roleFilter === 'both' || profile.role === roleFilter)
        .map(profile => ({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          role: profile.role as 'setter' | 'rep',
        }))

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