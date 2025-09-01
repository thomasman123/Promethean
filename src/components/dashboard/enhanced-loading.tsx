"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'widget' | 'card' | 'table' | 'chart';
  count?: number;
}

export function LoadingSkeleton({ 
  className, 
  variant = 'widget', 
  count = 1 
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'widget':
        return (
          <Card className={cn("kpi-widget", className)}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        );

      case 'card':
        return (
          <Card className={cn("rep-card", className)}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'table':
        return (
          <div className={cn("space-y-3", className)}>
            <div className="flex gap-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-32 ml-auto" />
            </div>
            <div className="enhanced-table">
              <div className="border rounded-lg">
                {/* Table header */}
                <div className="flex border-b bg-muted p-4 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                  ))}
                </div>
                {/* Table rows */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex p-4 gap-4 border-b last:border-b-0">
                    {[...Array(6)].map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <Card className={cn("dashboard-card", className)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        );

      default:
        return <Skeleton className={cn("h-20 w-full", className)} />;
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}

// Animated loading spinner
export function LoadingSpinner({ 
  size = 'md', 
  className 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size]
      )} />
    </div>
  );
}

// Pulsing dot indicator
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 bg-primary rounded-full animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

// Loading overlay for existing content
export function LoadingOverlay({ 
  isLoading, 
  children, 
  className 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
} 