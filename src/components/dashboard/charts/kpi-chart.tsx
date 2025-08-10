"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIChartProps {
  value: number | string;
  unit?: string;
  comparison?: {
    value: number;
    type: 'percentage' | 'absolute';
  };
  format?: (value: number | string) => string;
  className?: string;
}

export function KPIChart({ 
  value, 
  unit, 
  comparison,
  format,
  className 
}: KPIChartProps) {
  const formattedValue = format ? format(value) : value.toString();
  
  const getComparisonColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };
  
  const getComparisonIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4" />;
    if (value < 0) return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };
  
  const formatComparison = (comp: typeof comparison) => {
    if (!comp) return null;
    const sign = comp.value > 0 ? '+' : '';
    if (comp.type === 'percentage') {
      return `${sign}${comp.value}%`;
    }
    return `${sign}${comp.value}`;
  };

  return (
    <div className={cn("flex flex-col items-center justify-center h-full p-2", className)}>
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {formattedValue}
          </span>
          {unit && (
            <span className="text-lg sm:text-xl text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </div>
        
        {comparison && (
          <div className={cn(
            "flex items-center justify-center gap-1 mt-1 sm:mt-2",
            getComparisonColor(comparison.value)
          )}>
            {getComparisonIcon(comparison.value)}
            <span className="text-xs sm:text-sm font-medium">
              {formatComparison(comparison)}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              vs previous
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 