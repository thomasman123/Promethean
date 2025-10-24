"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Table2, ChevronDown, Trash2, Edit, Eye, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TableTypeSelector } from '@/components/data-view/table-type-selector'

interface DataTable {
  id: string
  name: string
  description: string | null
  is_default: boolean
  scope: 'private' | 'team' | 'global'
  created_by: string
  created_at: string
}

interface TablesManagerProps {
  accountId: string
  currentTableId: string | null
  onTableChange: (tableId: string) => void
}

export function TablesManager({ accountId, currentTableId, onTableChange }: TablesManagerProps) {
  const [tables, setTables] = useState<DataTable[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<DataTable | null>(null)
  const [newTable, setNewTable] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  console.log('TablesManager: accountId =', accountId, 'currentTableId =', currentTableId)

  useEffect(() => {
    loadTables()
  }, [accountId])

  // Load last opened table from localStorage when tables change
  useEffect(() => {
    if (tables.length > 0 && !currentTableId) {
      const lastTableId = localStorage.getItem(`lastTableId_${accountId}`)
      if (lastTableId && tables.find(t => t.id === lastTableId)) {
        // Use the last opened table if it exists
        onTableChange(lastTableId)
      } else if (tables.length > 0) {
        // Fall back to the first table if no last table is stored
        onTableChange(tables[0].id)
      }
    }
  }, [tables, accountId, currentTableId, onTableChange])

  async function loadTables() {
    console.log('Loading tables for accountId:', accountId)
    
    try {
      const response = await fetch(`/api/data-view/tables?accountId=${accountId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading tables:', result.error)
        return
      }

      console.log('Loaded tables via API:', result.tables)
      setTables(result.tables || [])
    } catch (error) {
      console.error('Error loading tables:', error)
    }
  }

  const handleCreateTable = async (tableConfig: {
    name: string
    description: string
    tableType: 'user_metrics' | 'account_metrics'
    scope: 'private' | 'team'
  }) => {
    setLoading(true)
    try {
      const response = await fetch('/api/data-view/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name: tableConfig.name,
          description: tableConfig.description,
          tableType: tableConfig.tableType,
          scope: tableConfig.scope
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create table',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: `Table "${tableConfig.name}" created successfully`
      })

      // Refresh tables list
      await loadTables()
      
      // Switch to the new table
      onTableChange(result.table.id)
      
    } catch (error) {
      console.error('Error creating table:', error)
      toast({
        title: 'Error',
        description: 'Failed to create table',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function updateTable() {
    if (!selectedTable || !newTable.name.trim()) return

    setLoading(true)
    const { error } = await supabase
      .from('data_tables')
      .update({
        name: newTable.name.trim(),
        description: newTable.description.trim() || null,
      })
      .eq('id', selectedTable.id)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setTables(tables.map(t => 
      t.id === selectedTable.id 
        ? { ...t, name: newTable.name, description: newTable.description || null }
        : t
    ))
    setIsEditOpen(false)
    
    toast({
      title: "Success",
      description: "Table updated successfully",
    })
  }

  async function deleteTable(tableId: string) {
    const confirmed = confirm('Are you sure you want to delete this table?')
    if (!confirmed) return

    const { error } = await supabase
      .from('data_tables')
      .delete()
      .eq('id', tableId)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setTables(tables.filter(t => t.id !== tableId))
    if (currentTableId === tableId) {
      // Switch to the first remaining table, or let the parent handle no tables
      const remainingTables = tables.filter(t => t.id !== tableId)
      if (remainingTables.length > 0) {
        onTableChange(remainingTables[0].id)
      }
    }
    
    toast({
      title: "Success",
      description: "Table deleted successfully",
    })
  }

  const currentTableName = tables.find(t => t.id === currentTableId)?.name || 'Select Table'

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'private':
        return <Eye className="h-3 w-3" />
      case 'team':
        return <Users className="h-3 w-3" />
      case 'global':
        return <Table2 className="h-3 w-3" />
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'private':
        return 'Personal'
      case 'team':
        return 'Team'
      case 'global':
        return 'Global'
      default:
        return 'Personal'
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Table2 className="h-4 w-4 mr-2" />
            {currentTableName}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onSelect={() => {
              setIsCreateOpen(true)
              setNewTable({ name: '', description: '' })
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Table
          </DropdownMenuItem>
          
          {tables.length > 0 && <DropdownMenuSeparator />}
          
          {tables.map((table) => (
            <DropdownMenuItem
              key={table.id}
              className="flex items-center justify-between group"
              onSelect={() => onTableChange(table.id)}
            >
              <div className="flex items-center gap-2">
                <span className={currentTableId === table.id ? 'font-semibold' : ''}>
                  {table.name}
                </span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  {getScopeIcon(table.scope)}
                  <span className="text-xs">{getScopeLabel(table.scope)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    setSelectedTable(table)
                    setNewTable({ name: table.name, description: table.description || '' })
                    setIsEditOpen(true)
                  }}
                  className="p-1 hover:bg-accent rounded"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    deleteTable(table.id)
                  }}
                  className="p-1 hover:bg-destructive/10 rounded text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}
          
          {tables.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">No tables yet</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Table Type Selector */}
      <TableTypeSelector
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreateTable={handleCreateTable}
      />

      {/* Edit Table Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-table-name">Table Name</Label>
              <Input
                id="edit-table-name"
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-table-description">Description (optional)</Label>
              <Textarea
                id="edit-table-description"
                value={newTable.description}
                onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  setNewTable({ name: '', description: '' })
                  setSelectedTable(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateTable} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 