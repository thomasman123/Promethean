"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { 
  Shield, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Mail,
  UserCheck,
  UserX
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TeamMember {
  user_id: string
  email: string
  full_name: string | null
  account_role: string
  display_role: string
  is_active: boolean
  created_for_data: boolean
  setter_activity_count: number
  sales_rep_activity_count: number
  total_activity_count: number
  granted_at: string
}

interface InviteUserForm {
  email: string
  fullName: string
  role: string
}

interface EditUserForm {
  fullName: string
  role: string
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [inviting, setInviting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  
  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    fullName: '',
    role: 'setter'
  })
  
  const [editForm, setEditForm] = useState<EditUserForm>({
    fullName: '',
    role: 'setter'
  })
  
  const { toast } = useToast()
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check user permissions
  useEffect(() => {
    const checkAccess = async () => {
      if (!effectiveUser || userLoading) return

      try {
        // Check if user is global admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', effectiveUser.id)
          .single()

        if (profile?.role === 'admin') {
          setHasAccess(true)
          return
        }

        // Check if user has account-level moderator access
        if (selectedAccountId) {
          const { data: access } = await supabase
            .from('account_access')
            .select('role')
            .eq('user_id', effectiveUser.id)
            .eq('account_id', selectedAccountId)
            .eq('is_active', true)
            .single()

          setHasAccess(access?.role === 'moderator')
        }
      } catch (error) {
        console.error('Error checking access:', error)
        setHasAccess(false)
      }
    }

    checkAccess()
  }, [effectiveUser, userLoading, selectedAccountId, supabase])

  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedAccountId || !hasAccess) return

      setLoading(true)
      try {
        const response = await fetch(`/api/team?accountId=${selectedAccountId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = 'Failed to load team members'
          
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
          
          throw new Error(errorMessage)
        }
        
        const data = await response.json()
        setTeamMembers(data.members || [])
      } catch (error) {
        console.error('Error loading team members:', error)
        
        let errorMessage = 'Failed to load team members'
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to server. Please ensure the development server is running.'
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [selectedAccountId, hasAccess, toast])

  const handleInviteUser = async () => {
    if (!selectedAccountId || !inviteForm.email) return

    setInviting(true)
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          email: inviteForm.email,
          fullName: inviteForm.fullName,
          role: inviteForm.role
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite user')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: result.message || "User invited successfully"
      })

      setInviteDialogOpen(false)
      setInviteForm({ email: '', fullName: '', role: 'setter' })
      
      // Reload team members
      const teamResponse = await fetch(`/api/team?accountId=${selectedAccountId}`)
      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        setTeamMembers(teamData.members || [])
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user",
        variant: "destructive"
      })
    } finally {
      setInviting(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedAccountId || !selectedMember) return

    setUpdating(true)
    try {
      const response = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          userId: selectedMember.user_id,
          role: editForm.role
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      })

      setEditDialogOpen(false)
      setSelectedMember(null)
      
      // Reload team members
      const teamResponse = await fetch(`/api/team?accountId=${selectedAccountId}`)
      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        setTeamMembers(teamData.members || [])
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedAccountId) return

    setRemoving(userId)
    try {
      const response = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          userId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      toast({
        title: "Success",
        description: "User removed successfully"
      })
      
      // Reload team members
      const teamResponse = await fetch(`/api/team?accountId=${selectedAccountId}`)
      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        setTeamMembers(teamData.members || [])
      }
    } catch (error) {
      console.error('Error removing user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user",
        variant: "destructive"
      })
    } finally {
      setRemoving(null)
    }
  }

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setEditForm({
      fullName: member.full_name || '',
      role: member.account_role
    })
    setEditDialogOpen(true)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Admin</Badge>
      case 'moderator':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Moderator</Badge>
      case 'sales_rep':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sales Rep</Badge>
      case 'setter':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Setter</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-2xl mx-auto">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                Only account moderators and admins can manage team members.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  if (!selectedAccountId) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 p-6">
          <div className="max-w-2xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Account Selected</AlertTitle>
              <AlertDescription>
                Please select an account from the dropdown to manage its team members.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-8 w-8" />
                Team Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage team members and their roles for this account
              </p>
            </div>
            
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new team member
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={inviteForm.fullName}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="setter">Setter</SelectItem>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInviteUser} disabled={inviting || !inviteForm.email}>
                      {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send Invitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Team Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({teamMembers.length})</CardTitle>
              <CardDescription>
                All users with access to this account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No team members</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by inviting your first team member
                  </p>
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.full_name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(member.account_role)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {member.is_active ? (
                              <>
                                <UserCheck className="h-4 w-4 text-green-500" />
                                <span className="text-green-700 dark:text-green-400">Active</span>
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 text-red-500" />
                                <span className="text-red-700 dark:text-red-400">Inactive</span>
                              </>
                            )}
                            {member.created_for_data && (
                              <Badge variant="secondary" className="text-xs">Data User</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Total: {member.total_activity_count}</div>
                            <div className="text-muted-foreground">
                              Setter: {member.setter_activity_count} | Rep: {member.sales_rep_activity_count}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(member.granted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUser(member.user_id)}
                              disabled={removing === member.user_id}
                            >
                              {removing === member.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={selectedMember.email} disabled />
              </div>
              
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setter">Setter</SelectItem>
                    <SelectItem value="sales_rep">Sales Rep</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditUser} disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 