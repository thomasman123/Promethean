"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  FolderOpen, 
  Share2, 
  Lock, 
  Users, 
  Globe,
  Trash2,
  Copy,
  ChevronDown
} from "lucide-react";
import { useDetailedDataStore, type SavedView } from "@/lib/dashboard/detailed-data-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ViewsManager() {
  const { user } = useAuth();
  const {
    savedViews,
    currentViewId,
    viewMode,
    groupBy,
    recordType,
    filters,
    columns,
    computedColumns,
    sortBy,
    saveView,
    loadView,
    deleteView,
  } = useDetailedDataStore();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [viewScope, setViewScope] = useState<"private" | "team" | "global">("private");

  const currentView = savedViews.find((v) => v.id === currentViewId);

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast.error("Please enter a view name");
      return;
    }

    try {
      await saveView({
        name: viewName,
        description: viewDescription,
        scope: viewScope,
        viewMode,
        groupBy,
        recordType,
        filters,
        columns,
        computedColumns,
        sortBy,
        createdBy: user?.id || "",
      });

      toast.success("View saved successfully");

      setIsSaveDialogOpen(false);
      setViewName("");
      setViewDescription("");
      setViewScope("private");
    } catch (error) {
      toast.error("Failed to save view");
    }
  };

  const handleLoadView = (viewId: string) => {
    loadView(viewId);
    const viewName = savedViews.find(v => v.id === viewId)?.name;
    toast.success(`Loaded view: ${viewName}`);
  };

  const handleDeleteView = async (viewId: string) => {
    if (confirm("Are you sure you want to delete this view?")) {
      await deleteView(viewId);
      toast.success("View deleted");
    }
  };

  const handleShareView = (view: SavedView) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view.id);
    navigator.clipboard.writeText(url.toString());
    toast.success("Share link copied to clipboard");
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case "private":
        return <Lock className="h-3 w-3" />;
      case "team":
        return <Users className="h-3 w-3" />;
      case "global":
        return <Globe className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            {currentView ? currentView.name : "Views"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {savedViews.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No saved views yet
            </div>
          ) : (
            savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className={cn(
                  "cursor-pointer",
                  currentViewId === view.id && "bg-accent"
                )}
                onClick={() => handleLoadView(view.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getScopeIcon(view.scope)}
                    <span className="truncate">{view.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareView(view);
                      }}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteView(view.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsSaveDialogOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save the current view configuration for later use
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="e.g., Weekly Sales Report"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="view-description">Description (optional)</Label>
              <Textarea
                id="view-description"
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
                placeholder="Describe what this view shows..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Visibility</Label>
              <RadioGroup value={viewScope} onValueChange={(v) => setViewScope(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="flex items-center gap-2 font-normal">
                    <Lock className="h-4 w-4" />
                    Private (only you)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex items-center gap-2 font-normal">
                    <Users className="h-4 w-4" />
                    Team (your team members)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="global" />
                  <Label htmlFor="global" className="flex items-center gap-2 font-normal">
                    <Globe className="h-4 w-4" />
                    Global (entire organization)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView}>Save View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 