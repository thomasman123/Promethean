"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { EnhancedSparkline, MiniSparkline } from "./enhanced-sparkline";
import { cn } from "@/lib/utils";

interface EnhancedKPIWidgetProps {
  title: string;
  value: number | string;
  unit?: string;
  change?: {
    value: number;
    type: 'percentage' | 'absolute';
    period?: string;
  };
  sparklineData?: number[];
  trend?: 'up' | 'down' | 'neutral';
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  icon?: React.ElementType;
  format?: (value: number | string) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EnhancedKPIWidget({ 
  title,
  value, 
  unit, 
  change,
  sparklineData,
  trend,
  status = 'good',
  icon: Icon,
  format,
  className,
  size = 'md'
}: EnhancedKPIWidgetProps) {
  const formattedValue = format ? format(value) : value.toString();
  
  const getChangeColor = (changeValue: number) => {
    if (changeValue > 0) return "text-success";
    if (changeValue < 0) return "text-destructive";
    return "text-muted-foreground";
  };
  
  const getChangeIcon = (changeValue: number) => {
    if (changeValue > 0) return <TrendingUp className="h-3 w-3" />;
    if (changeValue < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };
  
  const formatChange = (changeData: typeof change) => {
    if (!changeData) return null;
    const sign = changeData.value > 0 ? '+' : '';
    if (changeData.type === 'percentage') {
      return `${sign}${changeData.value.toFixed(1)}%`;
    }
    return `${sign}${changeData.value}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'border-l-success';
      case 'good': return 'border-l-primary';
      case 'warning': return 'border-l-warning';
      case 'critical': return 'border-l-destructive';
      default: return 'border-l-muted';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return {
        card: 'h-32',
        title: 'text-xs',
        value: 'text-lg',
        change: 'text-xs'
      };
      case 'lg': return {
        card: 'h-48',
        title: 'text-sm',
        value: 'text-4xl',
        change: 'text-sm'
      };
      default: return {
        card: 'h-36',
        title: 'text-sm',
        value: 'text-2xl',
        change: 'text-xs'
      };
    }
  };

  const sizeClasses = getSizeClasses(size);

  return (
    <Card className={cn(
      "kpi-widget border-l-4 relative overflow-hidden",
      sizeClasses.card,
      getStatusColor(status),
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-1.5 rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            )}
            <h3 className={cn("metric-label font-medium", sizeClasses.title)}>
              {title}
            </h3>
          </div>
          
          {status !== 'good' && (
            <Badge 
              variant={status === 'excellent' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs px-2 py-0.5"
            >
              {status === 'excellent' ? 'Top' : status === 'warning' ? 'Watch' : 'Focus'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Main Value */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className={cn("metric-value font-bold tracking-tight", sizeClasses.value)}>
                {formattedValue}
              </span>
              {unit && (
                <span className="text-muted-foreground text-sm font-medium">
                  {unit}
                </span>
              )}
            </div>
          </div>

          {/* Change Indicator */}
          {change && (
            <div className={cn(
              "flex items-center gap-1",
              sizeClasses.change,
              getChangeColor(change.value)
            )}>
              {getChangeIcon(change.value)}
              <span className="font-semibold">
                {formatChange(change)}
              </span>
              <span className="text-muted-foreground">
                {change.period || 'vs previous'}
              </span>
            </div>
          )}

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-2">
              <MiniSparkline 
                data={sparklineData} 
                trend={trend}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
          {Icon && <Icon className="w-full h-full text-primary" />}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactKPIWidget({
  title,
  value,
  change,
  icon: Icon,
  className
}: {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={cn(
      "kpi-widget p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="metric-label text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="metric-value text-xl font-bold">
              {value}
            </p>
            {change !== undefined && (
              <span className={cn(
                "text-xs font-medium flex items-center gap-0.5",
                change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 