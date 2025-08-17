"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit, 
  Pin, 
  Info,
  Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChartWrapperProps {
  title: string;
  description?: string;
  formula?: string;
  isLoading?: boolean;
  error?: string;
  pinned?: boolean;
  compareMode?: boolean;
  compareEntities?: number;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function ChartWrapper({
  title,
  description,
  formula,
  isLoading,
  error,
  pinned,
  compareMode,
  compareEntities,
  onEdit,
  onDuplicate,
  onDelete,
  onPin,
  className,
  children
}: ChartWrapperProps) {
  return (
    <Card className={cn("h-full min-h-0 flex flex-col", pinned && "ring-2 ring-primary", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 px-3 pt-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
            {compareMode && compareEntities && compareEntities > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="h-3 w-3" />
                {compareEntities}
              </Badge>
            )}
          </div>
          {description && (
            <CardDescription className="text-xs line-clamp-1">{description}</CardDescription>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {formula && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{formula}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onPin && (
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="mr-2 h-4 w-4" />
                  {pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 p-3 pt-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
          </div>
        ) : (
          <div className="h-full min-h-0 relative overflow-hidden">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 