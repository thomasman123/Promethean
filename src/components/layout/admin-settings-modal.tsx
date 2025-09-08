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
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserCheck, Users, Settings2, Shield } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface AdminSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminSettingsModal({ open, onOpenChange }: AdminSettingsModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    setLoading(true)
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
      setLoading(false)
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

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name?.toLowerCase() || '').includes(searchLower)
    )
  })

  const getRoleBadge = (role: string | null) => {
    if (!role) return <Badge variant="outline">User</Badge>
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Admin</Badge>
      case 'moderator':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Moderator</Badge>
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 grid w-fit grid-cols-2 rounded-lg bg-muted p-1">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" disabled>
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 flex flex-col px-6 pb-6 mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            <div className="flex-1 border rounded-lg overflow-hidden">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-background border-b">
                    <TableRow>
                      <TableHead className="bg-background">User</TableHead>
                      <TableHead className="bg-background">Email</TableHead>
                      <TableHead className="bg-background">Role</TableHead>
                      <TableHead className="bg-background">Joined</TableHead>
                      <TableHead className="bg-background text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium">
                              {user.full_name || 'Unnamed User'}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonate(user.id)}
                              disabled={impersonating === user.id}
                              className="ml-auto"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              {impersonating === user.id ? 'Impersonating...' : 'Impersonate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* User count */}
            {!loading && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 px-6 pb-6 mt-4">
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Settings coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 