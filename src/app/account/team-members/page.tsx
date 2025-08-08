"use client"

import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'

interface TeamMember {
  account_id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
  is_active: boolean
  granted_at: string
}

export default function TeamMembersPage() {
  const { selectedAccountId, getAccountBasedPermissions, accountChangeTimestamp } = useAuth()
  const permissions = getAccountBasedPermissions()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [ghlUsers, setGhlUsers] = useState<Array<{ id: string; email: string | null; name: string | null; role: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('setter')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (!selectedAccountId) return
    setLoading(true)
    setError(null)
    setMembers([])
    setGhlUsers([])
    fetchMembers()
    fetchGhlUsers()
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
      // Clear form and refresh
      setEmail('')
      setFullName('')
      setRole('setter')
      await fetchMembers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite')
    } finally {
      setInviting(false)
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

  if (!permissions.canManageAccount) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground">You don&apos;t have permission to manage team members.</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
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
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-6 text-muted-foreground">Loading members...</div>
                ) : error ? (
                  <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                ) : (
                  <div className="space-y-3">
                    {members.length === 0 ? (
                      <div className="text-muted-foreground">No members yet.</div>
                    ) : (
                      members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <div className="font-medium">{m.full_name || m.email}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">{m.role.replace('_',' ')}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invite Member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v: TeamMember['role']) => setRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setter">Setter</SelectItem>
                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={invite} disabled={inviting || !email}>Invite</Button>
                <p className="text-xs text-muted-foreground">
                  Invitations backfill historical appointments and dials for this email/name so reporting links correctly once they join.
                </p>
                {ghlUsers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="text-sm font-medium">Invite from GHL</div>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {ghlUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between rounded-md border p-2">
                          <div>
                            <div className="text-sm">{u.name || u.email || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{u.email || 'no email'}</div>
                          </div>
                          <Button size="sm" variant="outline" disabled={!u.email} onClick={() => { setEmail(u.email || ''); setFullName(u.name || ''); setRole('setter') }}>Fill</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 