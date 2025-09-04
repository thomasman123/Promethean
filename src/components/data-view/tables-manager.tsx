"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Table2, ChevronDown, Trash2, Edit } from 'lucide-react'
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

interface DataTable {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
}

interface TablesManagerProps {
  accountId: string
  currentTableId: string | null
  onTableChange: (tableId: string | null) => void
}

export function TablesManager({ accountId, currentTableId, onTableChange }: TablesManagerProps) {
  const [tables, setTables] = useState<DataTable[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<DataTable | null>(null)
  const [newTable, setNewTable] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadTables()
  }, [accountId])

  async function loadTables() {
    const { data, error } = await supabase
      .from('data_tables')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading tables:', error)
      return
    }

    setTables(data || [])
  }

  async function createTable() {
    if (!newTable.name.trim()) {
      toast({
        title: "Error",
        description: "Table name is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('data_tables')
      .insert({
        account_id: accountId,
        name: newTable.name.trim(),
        description: newTable.description.trim() || null,
        columns: [
          { id: 'name', field: 'name', header: 'Name', type: 'text' }
        ], // Default column
        filters: { roles: [] }
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setTables([data, ...tables])
    setNewTable({ name: '', description: '' })
    setIsCreateOpen(false)
    onTableChange(data.id)
    
    toast({
      title: "Success",
      description: "Table created successfully",
    })
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
      onTableChange(null)
    }
    
    toast({
      title: "Success",
      description: "Table deleted successfully",
    })
  }

  const currentTableName = tables.find(t => t.id === currentTableId)?.name || 'Select Table'

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
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                <Plus className="h-4 w-4 mr-2" />
                New Table
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Table</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="table-name">Table Name</Label>
                  <Input
                    id="table-name"
                    value={newTable.name}
                    onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                    placeholder="e.g., Q1 Performance"
                  />
                </div>
                <div>
                  <Label htmlFor="table-description">Description (optional)</Label>
                  <Textarea
                    id="table-description"
                    value={newTable.description}
                    onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                    placeholder="Describe what this table shows..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false)
                      setNewTable({ name: '', description: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createTable} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Table'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {tables.length > 0 && <DropdownMenuSeparator />}
          
          {tables.map((table) => (
            <DropdownMenuItem
              key={table.id}
              className="flex items-center justify-between group"
              onSelect={() => onTableChange(table.id)}
            >
              <span className={currentTableId === table.id ? 'font-semibold' : ''}>
                {table.name}
              </span>
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