"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, UserCheck, Users, Settings2, Shield, Building2, Plus, X, Building, Layout } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { UserAccountAccessManager } from "@/components/admin/user-account-access-manager"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface Account {
  id: string
  name: string
  description: string | null
  created_at: string
  is_active: boolean
}

interface AdminSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminSettingsModal({ open, onOpenChange }: AdminSettingsModalProps) {
  // User management state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [accessManagerOpen, setAccessManagerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Account management state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountSearchTerm, setAccountSearchTerm] = useState("")
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountDescription, setNewAccountDescription] = useState("")

  // Attribution sessions state
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionSearch, setSessionSearch] = useState("")
  const [sessionLimit, setSessionLimit] = useState<string>("50")
  
  // Layout preference state
  const [layoutPreference, setLayoutPreference] = useState<string>("classic")
  const [layoutLoading, setLayoutLoading] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetchUsers()
      fetchAccounts()
      fetchSessions()
      fetchLayoutPreference()
    }
  }, [open])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchAccounts = async () => {
    setAccountsLoading(true)
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive"
      })
    } finally {
      setAccountsLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      toast({
        title: "Error",
        description: "Account name is required",
        variant: "destructive"
      })
      return
    }

    setCreatingAccount(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountName.trim(),
          description: newAccountDescription.trim() || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create account')
      }

      toast({
        title: "Success",
        description: "Account created successfully"
      })

      // Reset form and refresh
      setNewAccountName("")
      setNewAccountDescription("")
      setShowCreateAccount(false)
      fetchAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      })
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId)
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to impersonate user')
      }

      toast({
        title: "Success",
        description: "Now impersonating user. Refreshing page..."
      })

      // Close modal and refresh page
      onOpenChange(false)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error impersonating user:', error)
      toast({
        title: "Error",
        description: "Failed to impersonate user",
        variant: "destructive"
      })
    } finally {
      setImpersonating(null)
    }
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
      case 'moderator':
        return <Badge className="bg-blue-100 text-blue-800">Moderator</Badge>
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  const filteredUsers = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name?.toLowerCase() || '').includes(searchLower)
    )
  })

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(accountSearchTerm.toLowerCase())
  )

  const fetchSessions = async () => {
    setSessionsLoading(true)
    try {
      const params = new URLSearchParams()
      if (sessionSearch.trim()) params.set('q', sessionSearch.trim())
      if (sessionLimit) params.set('limit', sessionLimit)
      const res = await fetch(`/api/admin/attribution-sessions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const json = await res.json()
      setSessions(json.sessions || [])
    } catch (e) {
      console.error('Error fetching sessions', e)
      toast({ title: 'Error', description: 'Failed to load attribution sessions', variant: 'destructive' })
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchLayoutPreference = async () => {
    try {
      const response = await fetch('/api/admin/layout-preference')
      if (response.ok) {
        const data = await response.json()
        setLayoutPreference(data.layoutPreference || 'classic')
      }
    } catch (error) {
      console.error('Error fetching layout preference:', error)
    }
  }

  const handleLayoutChange = async (newLayout: string) => {
    setLayoutLoading(true)
    try {
      const response = await fetch('/api/admin/layout-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutPreference: newLayout })
      })

      if (!response.ok) {
        throw new Error('Failed to update layout preference')
      }

      setLayoutPreference(newLayout)
      toast({
        title: "Success",
        description: "Layout preference updated. Refreshing page..."
      })

      // Dispatch event for layout wrapper to pick up
      window.dispatchEvent(new CustomEvent('layoutPreferenceChanged', { 
        detail: { layoutPreference: newLayout } 
      }))

      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error updating layout preference:', error)
      toast({
        title: "Error",
        description: "Failed to update layout preference",
        variant: "destructive"
      })
    } finally {
      setLayoutLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Settings
          </DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-80px)]">
          <Tabs defaultValue="users" className="h-full">
            <TabsList className="mx-6 mt-4 grid w-fit grid-cols-4">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Accounts
              </TabsTrigger>
              <TabsTrigger value="attribution" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Attribution
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="h-[calc(100%-60px)] px-6 pb-6">
              <div className="h-full flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Table */}
                <div className="flex-1 border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || 'Unnamed User'}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setAccessManagerOpen(true)
                                  }}
                                  title="Manage account access"
                                >
                                  <Building className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImpersonate(user.id)}
                                  disabled={impersonating === user.id}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Impersonate
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </TabsContent>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="h-[calc(100%-60px)] px-6 pb-6">
              <div className="h-full flex flex-col gap-4">
                {/* Search and Create */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts..."
                      value={accountSearchTerm}
                      onChange={(e) => setAccountSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => setShowCreateAccount(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </div>

                {/* Create Form */}
                {showCreateAccount && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold">Create New Account</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setShowCreateAccount(false)
                          setNewAccountName("")
                          setNewAccountDescription("")
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Account Name *</Label>
                        <Input
                          id="name"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          placeholder="Enter account name"
                          disabled={creatingAccount}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newAccountDescription}
                          onChange={(e) => setNewAccountDescription(e.target.value)}
                          placeholder="Enter description (optional)"
                          rows={3}
                          disabled={creatingAccount}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCreateAccount(false)
                            setNewAccountName("")
                            setNewAccountDescription("")
                          }}
                          disabled={creatingAccount}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateAccount}
                          disabled={creatingAccount || !newAccountName.trim()}
                        >
                          {creatingAccount ? 'Creating...' : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="flex-1 border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading accounts...
                          </TableCell>
                        </TableRow>
                      ) : filteredAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No accounts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">
                              {account.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {account.description || '-'}
                            </TableCell>
                            <TableCell>
                              {new Date(account.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={account.is_active ? "default" : "destructive"}>
                                {account.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" disabled>
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAccounts.length} of {accounts.length} accounts
                </div>
              </div>
            </TabsContent>

            {/* Attribution Tab */}
            <TabsContent value="attribution" className="h-[calc(100%-60px)] px-6 pb-6">
              <div className="h-full flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sessions (utm, fbclid, session id...)"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchSessions() }}
                      className="pl-10"
                    />
                  </div>
                  <Select value={sessionLimit} onValueChange={(v) => { setSessionLimit(v); setTimeout(fetchSessions, 0) }}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Limit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">Last 25</SelectItem>
                      <SelectItem value="50">Last 50</SelectItem>
                      <SelectItem value="100">Last 100</SelectItem>
                      <SelectItem value="200">Last 200</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchSessions}>Refresh</Button>
                </div>

                <div className="flex-1 border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>UTM</TableHead>
                        <TableHead>Meta IDs</TableHead>
                        <TableHead>fbclid</TableHead>
                        <TableHead>Landing URL</TableHead>
                        <TableHead>Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading sessions...</TableCell>
                        </TableRow>
                      ) : sessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">No sessions found</TableCell>
                        </TableRow>
                      ) : (
                        sessions.map((s) => (
                          <TableRow key={s.id || s.session_id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {s.last_activity_at ? new Date(s.last_activity_at).toLocaleString() : new Date(s.created_at).toLocaleString()}
                              <div>
                                <Badge variant={s.attribution_quality === 'perfect' ? 'default' : 'secondary'}>{s.attribution_quality || 'n/a'}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs font-mono break-all">
                              {s.session_id}
                              <div className="text-muted-foreground">{s.attribution_method}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div><span className="text-muted-foreground">src</span>: {s.utm_source || '-'}</div>
                              <div><span className="text-muted-foreground">med</span>: {s.utm_medium || '-'}</div>
                              <div className="truncate max-w-[220px]"><span className="text-muted-foreground">cmp</span>: {s.utm_campaign || '-'}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono">c: {s.meta_campaign_id || '-'}</div>
                              <div className="font-mono">as: {s.meta_ad_set_id || '-'}</div>
                              <div className="font-mono">ad: {s.meta_ad_id || '-'}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono break-all">
                              {s.fbclid || '-'}
                            </TableCell>
                            <TableCell className="text-xs break-all max-w-[360px]">
                              {s.landing_url || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {s.contact ? (
                                <div>
                                  <div className="truncate max-w-[220px]">{s.contact.email || '—'}</div>
                                  <div className="text-muted-foreground">acct: {s.contact.account_id || '—'}</div>
                                </div>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="h-[calc(100%-60px)] px-6 pb-6">
              <div className="h-full flex flex-col gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Layout Preference</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose your preferred layout style. This setting is only available to admin users.
                    </p>
                  </div>

                  <RadioGroup 
                    value={layoutPreference} 
                    onValueChange={handleLayoutChange}
                    disabled={layoutLoading}
                    className="gap-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="classic" id="classic" />
                      <Label htmlFor="classic" className="flex-1 cursor-pointer">
                        <div className="font-medium">Classic Layout</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Traditional top bar navigation with horizontal menu
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="modern" id="modern" />
                      <Label htmlFor="modern" className="flex-1 cursor-pointer">
                        <div className="font-medium">Modern Sidebar Layout</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Collapsible sidebar with vertical navigation and gradient cards
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {layoutLoading && (
                    <div className="text-sm text-muted-foreground">
                      Updating layout preference...
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* User Account Access Manager */}
      <UserAccountAccessManager
        open={accessManagerOpen}
        onOpenChange={setAccessManagerOpen}
        user={selectedUser}
      />
    </Dialog>
  )
} 