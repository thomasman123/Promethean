"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Plus, Copy, Trash2, Lock, Users, Globe, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface View {
  id: string
  name: string
  scope: "private" | "team" | "global"
  createdBy: string
  accountId: string
  isDefault?: boolean
}

interface ViewsManagerProps {
  accountId: string
  currentUserId: string
  currentViewId?: string
  onViewChange: (viewId: string) => void
}

export function ViewsManager({ accountId, currentUserId, currentViewId, onViewChange }: ViewsManagerProps) {
  const [views, setViews] = useState<View[]>([])
  const [currentView, setCurrentView] = useState<View | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)
  const [viewName, setViewName] = useState("")
  const [viewScope, setViewScope] = useState<"private" | "team">("private")
  const [loading, setLoading] = useState(false)

  // Load views
  useEffect(() => {
    if (accountId) {
      loadViews()
    }
  }, [accountId])

  // Sync currentView with currentViewId
  useEffect(() => {
    if (currentViewId && views.length > 0) {
      const view = views.find(v => v.id === currentViewId)
      if (view) {
        setCurrentView(view)
      }
    }
  }, [currentViewId, views])

  const loadViews = async () => {
    if (!accountId) return
    
    try {
      const response = await fetch(`/api/dashboard/views?accountId=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setViews(data.views || [])
        
        // If there's a currentViewId, find and set that view
        if (currentViewId) {
          const view = data.views?.find((v: View) => v.id === currentViewId)
          if (view) {
            setCurrentView(view)
          }
        } else {
          // Otherwise set default view if exists
          const defaultView = data.views?.find((v: View) => v.isDefault)
          if (defaultView) {
            setCurrentView(defaultView)
            onViewChange?.(defaultView.id)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load views:", error)
    }
  }

  const handleCreateView = async () => {
    if (!viewName || !accountId) return
    
    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName,
          accountId,
          scope: viewScope,
          isDefault: views.length === 0,
        }),
      })

      if (response.ok) {
        const { view } = await response.json()
        setViews([...views, view])
        setCurrentView(view)
        onViewChange?.(view.id)
        setIsCreateDialogOpen(false)
        setViewName("")
        setViewScope("private")
      }
    } catch (error) {
      console.error("Failed to create view:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateView = async (viewId: string) => {
    const viewToDuplicate = views.find(v => v.id === viewId)
    if (!viewToDuplicate) return

    setViewName(`${viewToDuplicate.name} (Copy)`)
    setViewScope(viewToDuplicate.scope as "private" | "team")
    setIsDuplicating(viewId)
    setIsCreateDialogOpen(true)
  }

  const handleDeleteView = async (viewId: string) => {
    if (!confirm("Are you sure you want to delete this view?")) return

    try {
      const response = await fetch(`/api/dashboard/views?id=${viewId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setViews(views.filter(v => v.id !== viewId))
        if (currentView?.id === viewId) {
          const firstView = views.find(v => v.id !== viewId)
          setCurrentView(firstView || null)
          onViewChange?.(firstView?.id || "")
        }
      }
    } catch (error) {
      console.error("Failed to delete view:", error)
    }
  }

  const handleSelectView = (viewId: string) => {
    const view = views.find(v => v.id === viewId)
    if (view) {
      setCurrentView(view)
      onViewChange?.(view.id)
    }
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case "private":
        return <Lock className="h-3 w-3" />
      case "team":
        return <Users className="h-3 w-3" />
      case "global":
        return <Globe className="h-3 w-3" />
      default:
        return null
    }
  }

  // Group views by scope
  const groupedViews = views.reduce((acc, view) => {
    if (!acc[view.scope]) {
      acc[view.scope] = []
    }
    acc[view.scope].push(view)
    return acc
  }, {} as Record<string, View[]>)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline"
            size="sm"
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-2" />
            <span className="max-w-[150px] truncate">
              {currentView?.name || 'Select View'}
            </span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={5} className="w-56 rounded-2xl">
          {/* Create new view */}
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New View
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* List views by scope */}
          {Object.entries(groupedViews).map(([scope, scopeViews]) => (
            <div key={scope}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {scope.charAt(0).toUpperCase() + scope.slice(1)} Views
              </DropdownMenuLabel>
              {scopeViews.map((view) => (
                <div
                  key={view.id}
                  className={cn(
                    "flex items-center justify-between px-2 py-1 hover:bg-accent rounded-xl",
                    currentView?.id === view.id && "bg-accent/50"
                  )}
                >
                  <button
                    onClick={() => handleSelectView(view.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {getScopeIcon(view.scope)}
                    <span className={cn(
                      "text-sm",
                      currentView?.id === view.id && "font-semibold"
                    )}>{view.name}</span>
                  </button>
                  {view.createdBy === currentUserId && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateView(view.id)
                        }}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteView(view.id)
                        }}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {views.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No views created yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create/Duplicate View Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {isDuplicating ? "Duplicate View" : "Create New View"}
            </DialogTitle>
            <DialogDescription>
              {isDuplicating 
                ? "Create a copy of the selected view with a new name."
                : "Create a new dashboard view to save your current configuration."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">View Name</Label>
              <Input
                id="name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="My Custom View"
                className="rounded-full"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scope">Who can see this view?</Label>
              <Select value={viewScope} onValueChange={(v) => setViewScope(v as "private" | "team")}>
                <SelectTrigger id="scope" className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="private" className="rounded-xl">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private (Only me)
                    </div>
                  </SelectItem>
                  <SelectItem value="team" className="rounded-xl">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team (All team members)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsDuplicating(null)
                setViewName("")
              }}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateView}
              disabled={!viewName || loading}
              className="rounded-full"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 