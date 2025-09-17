"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Users, Building, TrendingUp, Plus, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTable: (tableConfig: {
    name: string
    description: string
    tableType: 'user_metrics' | 'account_metrics' | 'time_series' | 'user_period_matrix'
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
    id: 'user_period_matrix',
    name: 'User Period Matrix',
    icon: Grid3X3,
    description: 'Track user performance across time periods',
    details: 'Matrix view with users and time periods. Shows performance trends for each team member.',
    examples: ['Weekly appointments per user', 'Monthly sales by rep', 'Daily dial performance']
  },
  {
    id: 'account_metrics',
    name: 'Account Metrics Table', 
    icon: Building,
    description: 'Track overall account performance and totals',
    details: 'Account-level metrics without user attribution. Shows business performance.',
    examples: ['Total leads generated', 'Ad spend totals', 'Overall conversion rates']
  },
  {
    id: 'time_series',
    name: 'Time Series Table',
    icon: TrendingUp, 
    description: 'Track metrics over time periods (daily, weekly, monthly)',
    details: 'Time periods as rows, metrics as columns. Perfect for trend analysis.',
    examples: ['Daily lead generation', 'Weekly revenue trends', 'Monthly performance']
  }
] as const

export function TableTypeSelector({ open, onOpenChange, onCreateTable }: TableTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'user_metrics' | 'account_metrics' | 'time_series' | 'user_period_matrix'>('user_metrics')
  const [tableName, setTableName] = useState('')
  const [tableDescription, setTableDescription] = useState('')

  const handleCreate = () => {
    if (!tableName.trim()) return

    onCreateTable({
      name: tableName.trim(),
      description: tableDescription.trim(),
      tableType: selectedType
    })

    // Reset form
    setTableName('')
    setTableDescription('')
    setSelectedType('user_metrics')
    onOpenChange(false)
  }

  const selectedTypeConfig = TABLE_TYPES.find(t => t.id === selectedType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Data Table
          </DialogTitle>
          <DialogDescription>
            Choose the type of data table you want to create, then configure its details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6">
          {/* Table Type Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Table Type</h3>
            <RadioGroup value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
              <div className="grid gap-4">
                {TABLE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <div key={type.id}>
                      <RadioGroupItem value={type.id} id={type.id} className="sr-only" />
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:bg-accent/50",
                          selectedType === type.id && "ring-2 ring-primary bg-accent"
                        )}
                        onClick={() => setSelectedType(type.id as any)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <Icon className="h-6 w-6 mt-1 text-primary" />
                            <div className="flex-1">
                              <CardTitle className="text-base">{type.name}</CardTitle>
                              <CardDescription className="text-sm mt-1">
                                {type.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-3">
                            {type.details}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {type.examples.map((example, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Table Configuration */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-medium">Table Configuration</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="tableName">Table Name</Label>
                <Input
                  id="tableName"
                  placeholder={`My ${selectedTypeConfig?.name || 'Table'}`}
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tableDescription">Description (Optional)</Label>
                <Textarea
                  id="tableDescription"
                  placeholder="Describe what this table will track..."
                  value={tableDescription}
                  onChange={(e) => setTableDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Selected Type Summary */}
            {selectedTypeConfig && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <selectedTypeConfig.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">Selected: {selectedTypeConfig.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTypeConfig.details}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!tableName.trim()}>
            Create Table
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 