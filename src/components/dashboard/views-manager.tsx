"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  FolderOpen, 
  ChevronDown, 
  Plus, 
  Copy, 
  Trash2,
  Lock,
  Users,
  Globe
} from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { ViewScope } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface ViewsManagerProps {
  className?: string;
}

const scopeIcons = {
  private: Lock,
  team: Users,
  global: Globe
};

export function ViewsManager({ className }: ViewsManagerProps) {
  const { 
    currentView,
    views,
    isDirty,
    saveCurrentView,
    loadView,
    createView,
    updateView,
    deleteView,
    duplicateView,
    widgets,
    filters,
    compareMode,
    compareEntities
  } = useDashboardStore();
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isNewView, setIsNewView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewNotes, setViewNotes] = useState("");
  const [viewScope, setViewScope] = useState<ViewScope>("private");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const handleSaveAs = () => {
    setIsNewView(true);
    setViewName(currentView ? `${currentView.name} (Copy)` : "New View");
    setViewNotes(currentView?.notes || "");
    setViewScope(currentView?.scope || "private");
    setIsSaveDialogOpen(true);
  };
  
  const handleSaveView = async () => {
    // Need accountId to create
    const accountId = currentView?.accountId || window.localStorage.getItem('promethean:selectedAccountId:' + (typeof window !== 'undefined' ? (JSON.parse(window.localStorage.getItem('supabase.auth.token') || '{}')?.currentSession?.user?.id || 'anon') : 'anon')) || undefined;

    if (isNewView) {
      if (!accountId) return alert('No account selected for this view.');
      // Create new view
      await createView(viewName, viewScope, viewNotes, accountId);
    } else if (currentView) {
      // Update existing view
      await updateView(currentView.id, {
        name: viewName,
        notes: viewNotes,
        scope: viewScope
      });
    }
    
    setIsSaveDialogOpen(false);
    setIsNewView(false);
  };
  
  const handleLoadView = async (viewId: string) => {
    if (isDirty) {
      const confirm = window.confirm("You have unsaved changes. Do you want to discard them?");
      if (!confirm) return;
    }
    await loadView(viewId);
  };
  
  const handleDeleteView = async (viewId: string) => {
    setIsDeleting(viewId);
    const view = views.find(v => v.id === viewId);
    const confirm = window.confirm(`Are you sure you want to delete "${view?.name}"?`);
    if (confirm) {
      await deleteView(viewId);
    }
    setIsDeleting(null);
  };
  
  const handleDuplicateView = async (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      await duplicateView(viewId, `${view.name} (Copy)`);
    }
  };
  
  // Group views by scope
  const groupedViews = views.reduce((acc, view) => {
    if (!acc[view.scope]) {
      acc[view.scope] = [];
    }
    acc[view.scope].push(view);
    return acc;
  }, {} as Record<ViewScope, typeof views>);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Current View Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            {currentView ? (
              <>
                <span>{currentView.name}</span>
                {isDirty && <Badge variant="secondary" className="ml-1">Modified</Badge>}
              </>
            ) : (
              "No View"
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Dashboard Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* New View */}
          <DropdownMenuItem onClick={handleSaveAs}>
            <Plus className="mr-2 h-4 w-4" />
            New View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          {/* Views grouped by scope */}
          {Object.entries(groupedViews).map(([scope, scopeViews]) => {
            const ScopeIcon = scopeIcons[scope as ViewScope];
            return (
              <div key={scope}>
                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
                  <ScopeIcon className="h-3 w-3" />
                  {scope.charAt(0).toUpperCase() + scope.slice(1)}
                </DropdownMenuLabel>
                {scopeViews.map(view => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center justify-between group"
                    onSelect={() => handleLoadView(view.id)}
                  >
                    <span className={cn(
                      "flex-1",
                      currentView?.id === view.id && "font-medium"
                    )}>
                      {view.name}
                      {view.isDefault && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Default
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateView(view.id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {!view.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(view.id);
                          }}
                          disabled={isDeleting === view.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Save Button */}
      <Button
        variant={isDirty ? "default" : "outline"}
        size="icon"
        onClick={() => {
          if (currentView) {
            saveCurrentView();
          } else {
            handleSaveAs();
          }
        }}
        title={currentView ? "Save view" : "Save as new view"}
      >
        <Save className="h-4 w-4" />
      </Button>
      
      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNewView ? "Save New View" : "Update View"}
            </DialogTitle>
            <DialogDescription>
              Save your current dashboard configuration as a view
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="My Dashboard View"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="view-notes">Notes (optional)</Label>
              <Textarea
                id="view-notes"
                value={viewNotes}
                onChange={(e) => setViewNotes(e.target.value)}
                placeholder="Description of this view..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Visibility</Label>
              <RadioGroup value={viewScope} onValueChange={(v) => setViewScope(v as ViewScope)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Private (Only you)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Team (Your account members)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="global" />
                  <Label htmlFor="global" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    Global (All users in account)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">This view will save:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• {widgets.length} widgets and their positions</li>
                <li>• Current filters and date range</li>
                <li>• Compare mode: {compareMode ? `On (${compareEntities.length} entities)` : "Off"}</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={!viewName}>
              {isNewView ? "Create View" : "Update View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 