"use client"

import { useState } from 'react'
import { Users, Building, Eye, Users as TeamIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TableTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTable: (config: {
    name: string
    description: string
    tableType: 'user_metrics' | 'account_metrics'
    scope: 'private' | 'team'
  }) => void
}

const TABLE_TYPES = [
  {
    id: 'user_metrics',
    name: 'User Performance Table',
    icon: Users,
    description: 'Track metrics by individual users (setters, sales reps)',
    details: 'Users as rows, metrics as columns. Perfect for comparing performance across team members.',
    examples: ['Hours worked per setter', 'Appointments booked per rep', 'Call performance by user']
  },
  {
    id: 'account_metrics',
    name: 'Account Metrics Table', 
    icon: Building,
    description: 'Track overall account performance and totals',
    details: 'Account-level metrics without user attribution. Shows business performance.',
    examples: ['Total leads generated', 'Ad spend totals', 'Overall conversion rates']
  }
] as const

const SCOPE_OPTIONS = [
  {
    id: 'private',
    name: 'Personal Table',
    icon: Eye,
    description: 'Only visible to you',
    details: 'Private table that only you can see and modify.'
  },
  {
    id: 'team',
    name: 'Team Table',
    icon: TeamIcon,
    description: 'Visible to all team members',
    details: 'Shared with all team members in this account.'
  }
] as const

export function TableTypeSelector({ open, onOpenChange, onCreateTable }: TableTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'user_metrics' | 'account_metrics'>('user_metrics')
  const [selectedScope, setSelectedScope] = useState<'private' | 'team'>('private')
  const [tableName, setTableName] = useState('')
  const [tableDescription, setTableDescription] = useState('')

  const handleCreate = () => {
    if (!tableName.trim()) return

    onCreateTable({
      name: tableName.trim(),
      description: tableDescription.trim(),
      tableType: selectedType,
      scope: selectedScope
    })

    // Reset form
    setTableName('')
    setTableDescription('')
    setSelectedType('user_metrics')
    setSelectedScope('private')
    onOpenChange(false)
  }

  const selectedTypeConfig = TABLE_TYPES.find(t => t.id === selectedType)
  const selectedScopeConfig = SCOPE_OPTIONS.find(s => s.id === selectedScope)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Data Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Table Name and Description */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="tableName">Table Name *</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Enter table name..."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="tableDescription">Description</Label>
              <Textarea
                id="tableDescription"
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="Optional description..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Table Type Selection */}
          <div>
            <Label className="text-base font-medium">Table Type</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as 'user_metrics' | 'account_metrics')}
              className="mt-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TABLE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <Card key={type.id} className={`cursor-pointer transition-colors ${
                      selectedType === type.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={type.id} id={type.id} />
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-sm">{type.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          {type.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-2">{type.details}</p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Examples:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {type.examples.map((example, idx) => (
                              <li key={idx}>• {example}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Scope Selection */}
          <div>
            <Label className="text-base font-medium">Visibility</Label>
            <RadioGroup
              value={selectedScope}
              onValueChange={(value) => setSelectedScope(value as 'private' | 'team')}
              className="mt-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCOPE_OPTIONS.map((scope) => {
                  const Icon = scope.icon
                  return (
                    <Card key={scope.id} className={`cursor-pointer transition-colors ${
                      selectedScope === scope.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={scope.id} id={scope.id} />
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-sm">{scope.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          {scope.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">{scope.details}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Type:</strong> {selectedTypeConfig?.name}</p>
              <p><strong>Visibility:</strong> {selectedScopeConfig?.name}</p>
              {tableName && <p><strong>Name:</strong> {tableName}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!tableName.trim()}
            >
              Create Table
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 