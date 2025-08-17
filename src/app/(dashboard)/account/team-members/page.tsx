"use client"

import { useEffect, useState } from 'react'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface TeamMember {
  account_id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
  is_active: boolean
  granted_at: string
  created_for_data?: boolean
}

interface PendingUser {
  ghl_user_id: string
  name: string
  email: string | null
  primary_role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
  roles: string[]
  activity_count: number
  setter_activity_count: number
  sales_rep_activity_count: number
  last_seen_at: string
}

interface GhlUser {
  id: string
  email: string | null
  name: string | null
  role: string | null
  invited?: boolean
  joined?: boolean
}

export default function TeamMembersPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp, isAdmin } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [ghlUsers, setGhlUsers] = useState<GhlUser[]>([])
  const [dataUserPreviews, setDataUserPreviews] = useState<any[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('setter')
  const [inviting, setInviting] = useState(false)
  const [openInvite, setOpenInvite] = useState(false)
  const [convertingUser, setConvertingUser] = useState<string | null>(null)
  const [invitingPendingUser, setInvitingPendingUser] = useState<string | null>(null)
  const [invitingGhlUser, setInvitingGhlUser] = useState<string | null>(null)
  const [updatingRoleUser, setUpdatingRoleUser] = useState<string | null>(null)
  // Add dialog state for inviting GHL user with chosen role
  const [openGhlInvite, setOpenGhlInvite] = useState(false)
  const [ghlInviteUser, setGhlInviteUser] = useState<GhlUser | null>(null)
  const [ghlInviteRole, setGhlInviteRole] = useState<TeamMember['role']>('setter')

  useEffect(() => {
    if (!selectedAccountId) return
    setLoading(true)
    setError(null)
    setMembers([])
    setGhlUsers([])
    setPendingUsers([])
    fetchMembers()
    fetchGhlUsers()
    fetchDataUserPreviews()
    fetchPendingUsers()
  }, [selectedAccountId, accountChangeTimestamp])

  const fetchMembers = async () => {
    if (!selectedAccountId) return
    try {
      const ts = Date.now()
      const res = await fetch(`/api/team?accountId=${selectedAccountId}&_ts=${ts}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch team')
      setMembers(data.members || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  const fetchGhlUsers = async () => {
    if (!selectedAccountId) return
    try {
      const ts = Date.now()
      const res = await fetch(`/api/team/ghl?accountId=${selectedAccountId}&_ts=${ts}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch GHL users')
      setGhlUsers(data.users || [])
    } catch {
      // ignore silently for now
    }
  }

  const fetchDataUserPreviews = async () => {
    if (!selectedAccountId) return
    try {
      const ts = Date.now()
      const res = await fetch(`/api/team/data-users-preview?accountId=${selectedAccountId}&_ts=${ts}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch data user previews')
      setDataUserPreviews(data.dataUsers || [])
    } catch (e) {
      console.warn('Failed to fetch data user previews:', e)
      setDataUserPreviews([])
    }
  }

  const fetchPendingUsers = async () => {
    if (!selectedAccountId) return
    try {
      const ts = Date.now()
      const res = await fetch(`/api/team/pending-ghl-users?accountId=${selectedAccountId}&_ts=${ts}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pending users')
      setPendingUsers(data.pendingUsers || [])
    } catch (e) {
      console.warn('Failed to fetch pending users:', e)
      setPendingUsers([])
    }
  }

  const invite = async () => {
    if (!selectedAccountId || !email) return
    setInviting(true)
    setError(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, email, fullName, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      toast.success(data.message || 'Invitation sent successfully!')
      setEmail('')
      setFullName('')
      setRole('setter')
      await fetchMembers()
      await fetchPendingUsers()
      setOpenInvite(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  const invitePendingUser = async (pendingUser: PendingUser) => {
    if (!selectedAccountId) return
    setInvitingPendingUser(pendingUser.ghl_user_id)
    setError(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: selectedAccountId,
          email: pendingUser.email,
          fullName: pendingUser.name,
          role: pendingUser.primary_role
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      toast.success(`Successfully invited ${pendingUser.name}!`)
      await fetchMembers()
      await fetchPendingUsers()
      await fetchGhlUsers()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to invite user'
      setError(errorMessage)
      toast.error(`Failed to invite ${pendingUser.name}: ${errorMessage}`)
    } finally {
      setInvitingPendingUser(null)
    }
  }

  const roleFromGhl = (r?: string | null): TeamMember['role'] => {
    const s = (r || '').toLowerCase()
    if (s.includes('sales')) return 'sales_rep'
    if (s.includes('moderator')) return 'moderator'
    return 'setter'
  }

  // Accept optional chosenRole to respect user selection from dialog
  const inviteGhlUser = async (user: GhlUser, chosenRole?: TeamMember['role']) => {
    if (!selectedAccountId || !user.email) return
    setInvitingGhlUser(user.id)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: selectedAccountId,
          email: user.email,
          fullName: user.name || '',
          role: chosenRole || roleFromGhl(user.role)
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      toast.success(`Invitation sent to ${user.name || user.email}`)
      await fetchMembers()
      await fetchPendingUsers()
      await fetchGhlUsers()
      setOpenGhlInvite(false)
      setGhlInviteUser(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to invite user')
    } finally {
      setInvitingGhlUser(null)
    }
  }

  const updateRole = async (userId: string, newRole: TeamMember['role']) => {
    if (!selectedAccountId) return
    setUpdatingRoleUser(userId)
    try {
      const res = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, userId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      toast.success('Role updated')
      await fetchMembers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
      toast.error(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setUpdatingRoleUser(null)
    }
  }

  const removeMember = async (userId: string) => {
    if (!selectedAccountId) return
    if (!confirm('Remove this member from the account?')) return
    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')
      await fetchMembers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove member')
    }
  }

  const convertToInvited = async (userId: string, currentEmail: string, currentName: string) => {
    if (!selectedAccountId) return
    setConvertingUser(userId)
    setError(null)
    
    const realEmail = prompt(`Enter the real email address for ${currentName}:`, currentEmail.replace('+data@promethean.ai', '@company.com'))
    if (!realEmail) {
      setConvertingUser(null)
      return
    }
    
    try {
      const res = await fetch('/api/team/convert-data-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: selectedAccountId, 
          userId, 
          realEmail,
          fullName: currentName 
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to convert user')
      
      await fetchMembers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to convert user')
    } finally {
      setConvertingUser(null)
    }
  }

  if (!permissions.canManageAccount) {
    return (
      <SidebarInset>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You don&apos;t have permission to manage team members.</p>
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/account">Account</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Team Members</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Team Members</CardTitle>
                <Button onClick={() => setOpenInvite(true)}>Invite Member</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && <div>Loading...</div>}
                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {!loading && (
                  <div className="space-y-3">
                    {members.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No team members found.</div>
                    ) : (
                      members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between p-3 border rounded">
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              {m.full_name || 'Unknown'}
                              {m.created_for_data && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Data User
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{m.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Role: {m.role.replace('_', ' ')} | Status: {m.is_active ? 'Active' : 'Inactive'}
                              {m.created_for_data && ' | Created for data linking'}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Select
                              value={m.role}
                              onValueChange={(v) => updateRole(m.user_id, v as TeamMember['role'])}
                              disabled={updatingRoleUser === m.user_id}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {isAdmin() && <SelectItem value="admin">Admin</SelectItem>}
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                                <SelectItem value="setter">Setter</SelectItem>
                              </SelectContent>
                            </Select>
                            {m.created_for_data ? (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => convertToInvited(m.user_id, m.email, m.full_name || 'Unknown')}
                                disabled={convertingUser === m.user_id}
                              >
                                {convertingUser === m.user_id ? 'Converting...' : 'Invite'}
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => removeMember(m.user_id)}>Remove</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GHL Users Section */}
            {ghlUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    GHL Users
                    <Badge variant="secondary">{ghlUsers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ghlUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          {u.name || 'Unknown'}
                          {u.role && (
                            <Badge variant="secondary">{u.role}</Badge>
                          )}
                          {u.email && <Badge variant="outline" className="text-green-600">✓ Email</Badge>}
                          {u.joined && <Badge variant="outline">Joined</Badge>}
                          {u.invited && !u.joined && <Badge variant="outline">Invited</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{u.email || 'No email'}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => { setGhlInviteUser(u); setGhlInviteRole(roleFromGhl(u.role)); setOpenGhlInvite(true) }}
                          disabled={!u.email || u.invited || u.joined || invitingGhlUser === u.id}
                        >
                          {invitingGhlUser === u.id ? 'Inviting...' : u.joined ? 'Already Member' : u.invited ? 'Invited' : 'Invite to App'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending GHL Users Section */}
            {pendingUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Pending GHL Users
                    <Badge variant="secondary">{pendingUsers.length}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Users from your GHL account who have activity in appointments, discoveries, or dials but haven't been invited to the app yet.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingUsers.map((user) => (
                    <div key={user.ghl_user_id} className="flex items-center justify-between p-3 border rounded">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          {user.name || 'Unknown'}
                          <Badge variant={user.activity_count >= 5 ? 'default' : 'secondary'}>
                            {user.primary_role.replace('_', ' ')}
                          </Badge>
                          {user.email && (
                            <Badge variant="outline" className="text-green-600">
                              ✓ Email
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email || 'No email'}</div>
                        <div className="text-xs text-muted-foreground">
                          Activity: {user.activity_count} | Last seen: {new Date(user.last_seen_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => invitePendingUser(user)}
                          disabled={invitingPendingUser === user.ghl_user_id || !user.email}
                        >
                          {invitingPendingUser === user.ghl_user_id ? 'Inviting...' : 'Invite to App'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Data Users Section */}
            {dataUserPreviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Data-Created Users
                    <Badge variant="secondary">{dataUserPreviews.length}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Users automatically created from appointment and call data. Review and invite active users.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dataUserPreviews.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          {user.name || 'Unknown'}
                          <Badge 
                            variant={user.recommended_action === 'invite' ? 'default' : 
                                   user.recommended_action === 'verify' ? 'secondary' : 'outline'}
                          >
                            {user.recommended_action}
                          </Badge>
                          {user.ghl_email_found && (
                            <Badge variant="outline" className="text-green-600">
                              ✓ GHL Email
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Activity: {user.appointment_count} appointments, {user.discovery_count} discoveries, {user.dial_count} dials
                          {user.data_sources.length > 0 && ` • Sources: ${user.data_sources.join(', ')}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {user.recommended_action !== 'ignore' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => convertToInvited(user.user_id, user.email, user.name || 'Unknown')}
                            disabled={convertingUser === user.user_id}
                          >
                            {convertingUser === user.user_id ? 'Inviting...' : 'Invite'}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeMember(user.user_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={openInvite} onOpenChange={(o) => { setOpenInvite(o); if (!o) { setEmail(''); setFullName(''); setRole('setter') } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>
                Invitations backfill historical appointments and dials for this email/name so reporting links correctly once they join.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@company.com" />
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as TeamMember['role'])}>
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

              {error && (
                <div className="p-3 text-sm bg-red-50 border border-red-200 rounded text-red-600">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={invite} disabled={inviting || !email}>Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite specific GHL user with selected role */}
        <Dialog open={openGhlInvite} onOpenChange={(o) => { setOpenGhlInvite(o); if (!o) { setGhlInviteUser(null); setGhlInviteRole('setter') } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite GHL User</DialogTitle>
              <DialogDescription>
                Choose the role for the invite. Default is based on the user’s GHL role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground">
                {ghlInviteUser?.name || 'Unknown'} {ghlInviteUser?.email ? `• ${ghlInviteUser.email}` : ''}
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={ghlInviteRole} onValueChange={(v) => setGhlInviteRole(v as TeamMember['role'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin() && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="sales_rep">Sales Rep</SelectItem>
                    <SelectItem value="setter">Setter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => { if (ghlInviteUser) inviteGhlUser(ghlInviteUser, ghlInviteRole) }} 
                disabled={!ghlInviteUser?.email || (ghlInviteUser ? invitingGhlUser === ghlInviteUser.id : false)}
              >
                {ghlInviteUser && invitingGhlUser === ghlInviteUser.id ? 'Inviting...' : 'Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </SidebarInset>
  )
} 