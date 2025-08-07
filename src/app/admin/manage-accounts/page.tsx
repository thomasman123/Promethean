"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { 
  Building2, 
  Plus, 
  Settings, 
  UserPlus, 
  Trash2,
  Shield,
  PhoneCall,
  TrendingUp
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Account {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
  is_active: boolean
}

interface AccountAccess {
  id: string
  user_id: string
  account_id: string
  role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
  is_active: boolean
  granted_at: string
  user_profile?: UserProfile
}

export default function ManageAccountsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [accountAccess, setAccountAccess] = useState<Record<string, AccountAccess[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  
  // Form states
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountDescription, setNewAccountDescription] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedRole, setSelectedRole] = useState<'moderator' | 'sales_rep' | 'setter'>('setter')
  
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [assignUserOpen, setAssignUserOpen] = useState(false)

  const roleColors = {
    moderator: "bg-blue-100 text-blue-800 border-blue-200", 
    sales_rep: "bg-green-100 text-green-800 border-green-200",
    setter: "bg-yellow-100 text-yellow-800 border-yellow-200"
  }

  const roleIcons = {
    moderator: Settings,
    sales_rep: TrendingUp,
    setter: PhoneCall
  }

  useEffect(() => {
    fetchAccounts()
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
      
      // Fetch access for each account
      if (data) {
        for (const account of data) {
          await fetchAccountAccess(account.id)
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('email') // Order by email instead since it's always present

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    }
  }

  const fetchAccountAccess = async (accountId: string) => {
    try {
      // First get account access records
      const { data: accessData, error: accessError } = await supabase
        .from('account_access')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)

      if (accessError) throw accessError

      if (!accessData || accessData.length === 0) {
        setAccountAccess(prev => ({
          ...prev,
          [accountId]: []
        }))
        return
      }

      // Get user IDs
      const userIds = accessData.map(access => access.user_id)

      // Then get user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // Combine the data
      const transformedData: AccountAccess[] = accessData.map(access => ({
        ...access,
        user_profile: profilesData?.find(profile => profile.id === access.user_id)
      }))
      
      setAccountAccess(prev => ({
        ...prev,
        [accountId]: transformedData
      }))
    } catch (error) {
      console.error('Error fetching account access:', error)
    }
  }

  const createAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Account name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .insert([{
          name: newAccountName.trim(),
          description: newAccountDescription.trim() || null,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Account created successfully')
      setNewAccountName("")
      setNewAccountDescription("")
      setCreateAccountOpen(false)
      fetchAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error('Failed to create account')
    }
  }

  const assignUserToAccount = async () => {
    if (!selectedAccount || !selectedUser || !selectedRole) {
      toast.error('Please select account, user, and role')
      return
    }

    try {
      const { error } = await supabase
        .rpc('grant_account_access', {
          p_user_id: selectedUser,
          p_account_id: selectedAccount.id,
          p_role: selectedRole,
          p_granted_by_user_id: user?.id
        })

      if (error) throw error

      toast.success('User assigned successfully')
      setSelectedUser("")
      setSelectedRole('setter')
      setAssignUserOpen(false)
      fetchAccountAccess(selectedAccount.id)
    } catch (error) {
      console.error('Error assigning user:', error)
      toast.error('Failed to assign user')
    }
  }

  const removeUserFromAccount = async (accountId: string, userId: string) => {
    try {
      const { error } = await supabase
        .rpc('revoke_account_access', {
          user_id: userId,
          account_id: accountId
        })

      if (error) throw error

      toast.success('User removed successfully')
      fetchAccountAccess(accountId)
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Failed to remove user')
    }
  }

  const getRoleIcon = (role: string) => {
    // For account-based roles, we don't show admin (app-wide role)
    if (role === 'admin') return <Shield className="h-3 w-3" />
    const IconComponent = roleIcons[role as keyof typeof roleIcons]
    return IconComponent ? <IconComponent className="h-3 w-3" /> : null
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manage Accounts</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Manage Accounts</h1>
            </div>
            
            <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>
                    Create a new account to organize users and manage access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Enter account name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="account-description">Description (Optional)</Label>
                    <Textarea
                      id="account-description"
                      value={newAccountDescription}
                      onChange={(e) => setNewAccountDescription(e.target.value)}
                      placeholder="Describe this account"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateAccountOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createAccount}>Create Account</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {account.name}
                      </CardTitle>
                      {account.description && (
                        <CardDescription>{account.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Dialog open={assignUserOpen && selectedAccount?.id === account.id} onOpenChange={(open) => {
                        setAssignUserOpen(open)
                        if (open) setSelectedAccount(account)
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedAccount(account)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Manage Users
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Manage Users for {account.name}</DialogTitle>
                            <DialogDescription>
                              Assign users to this account and manage their roles. Note: Admin role is app-wide, not account-specific.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Assign New User Section */}
                            <div className="border rounded-lg p-4 space-y-4">
                              <h3 className="text-lg font-medium">Assign New User</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="user-select">Select User</Label>
                                                                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {users
                                        .filter(user => 
                                          !accountAccess[account.id]?.some(access => access.user_id === user.id) &&
                                          user.role !== 'admin' // Exclude admin users
                                        )
                                        .length > 0 ? (
                                        users
                                          .filter(user => 
                                            !accountAccess[account.id]?.some(access => access.user_id === user.id) &&
                                            user.role !== 'admin'
                                          )
                                          .map((user) => (
                                          <SelectItem key={user.id} value={user.id}>
                                            {user.full_name || user.email} 
                                            <span className="text-xs text-muted-foreground ml-2">
                                              ({user.role})
                                            </span>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-users" disabled>
                                          No users available (admins excluded)
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="role-select">Account Role</Label>
                                  <Select value={selectedRole} onValueChange={(value: 'moderator' | 'sales_rep' | 'setter') => setSelectedRole(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="moderator">Moderator</SelectItem>
                                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                                      <SelectItem value="setter">Setter</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button 
                                onClick={assignUserToAccount} 
                                disabled={!selectedUser || selectedUser === 'no-users'}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign User
                              </Button>
                            </div>

                            {/* Current Users Section */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-medium">Current Users ({accountAccess[account.id]?.length || 0})</h3>
                              {accountAccess[account.id]?.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Email</TableHead>
                                      <TableHead>Account Role</TableHead>
                                      <TableHead>Granted</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {accountAccess[account.id].map((access) => (
                                      <TableRow key={access.id}>
                                        <TableCell className="font-medium">
                                          {access.user_profile?.full_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>{access.user_profile?.email}</TableCell>
                                        <TableCell>
                                          <Badge className={access.role === 'admin' ? "bg-red-100 text-red-800 border-red-200" : roleColors[access.role as keyof typeof roleColors]}>
                                            <span className="flex items-center gap-1">
                                              {getRoleIcon(access.role)}
                                              {access.role.replace('_', ' ')}
                                            </span>
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {new Date(access.granted_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeUserFromAccount(account.id, access.user_id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  No users assigned to this account yet.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setAssignUserOpen(false)}>
                              Close
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {accountAccess[account.id]?.length || 0} assigned users
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 