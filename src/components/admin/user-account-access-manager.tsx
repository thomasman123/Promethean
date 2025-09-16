"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Building, UserCheck, UserX, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

interface UserAccountAccess {
  accountId: string
  accountName: string
  role: string
  hasAccess: boolean
  grantedAt?: string
}

interface UserAccountAccessManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export function UserAccountAccessManager({ open, onOpenChange, user }: UserAccountAccessManagerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<UserAccountAccess[]>([])
  const [originalAccess, setOriginalAccess] = useState<UserAccountAccess[]>([])
  const { toast } = useToast()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (open && user) {
      loadUserAccountAccess()
    }
  }, [open, user])

  const loadUserAccountAccess = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get all accounts and user's current access
      const response = await fetch(`/api/admin/user-account-access?userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to load user account access')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
      setOriginalAccess(data.accounts || [])
      
    } catch (error) {
      console.error('Error loading user account access:', error)
      toast({
        title: "Error",
        description: "Failed to load user account access",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAccessChange = (accountId: string, hasAccess: boolean) => {
    setAccounts(prev => prev.map(account => 
      account.accountId === accountId 
        ? { ...account, hasAccess }
        : account
    ))
  }

  const handleRoleChange = (accountId: string, role: string) => {
    setAccounts(prev => prev.map(account => 
      account.accountId === accountId 
        ? { ...account, role }
        : account
    ))
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Prepare changes
      const changes = accounts.map(account => ({
        accountId: account.accountId,
        hasAccess: account.hasAccess,
        role: account.role
      }))

      const response = await fetch('/api/admin/update-user-account-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          changes
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user account access')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: `Updated account access for ${user.full_name || user.email}`,
      })

      console.log('✅ User account access updated:', result)
      onOpenChange(false)
      
    } catch (error) {
      console.error('❌ Error updating user account access:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account access",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    return JSON.stringify(accounts) !== JSON.stringify(originalAccess)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'moderator':
        return 'default'
      case 'sales_rep':
        return 'secondary'
      case 'setter':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const accessCount = accounts.filter(a => a.hasAccess).length
  const totalAccounts = accounts.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Manage Account Access
          </DialogTitle>
          <DialogDescription>
            Configure which accounts {user?.full_name || user?.email} can access and their role in each account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{user?.full_name || user?.email}</h4>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{accessCount}/{totalAccounts}</div>
                  <div className="text-xs text-muted-foreground">Accounts Access</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Access List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading account access...
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map(account => (
                  <Card key={account.accountId} className={account.hasAccess ? "ring-1 ring-primary/20" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-4">
                        {/* Access Checkbox */}
                        <Checkbox
                          checked={account.hasAccess}
                          onCheckedChange={(checked) => handleAccessChange(account.accountId, !!checked)}
                        />

                        {/* Account Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{account.accountName}</h4>
                            {account.hasAccess ? (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <UserX className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {account.grantedAt && (
                            <p className="text-xs text-muted-foreground">
                              Access granted: {new Date(account.grantedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Role Selection */}
                        <div className="w-48">
                          <Select 
                            value={account.role} 
                            onValueChange={(value) => handleRoleChange(account.accountId, value)}
                            disabled={!account.hasAccess}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="sales_rep">Sales Rep</SelectItem>
                              <SelectItem value="setter">Setter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Current Role Badge */}
                        <Badge variant={getRoleBadgeVariant(account.role)} className="min-w-20 justify-center">
                          {account.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasChanges() ? "You have unsaved changes" : "No changes made"}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 