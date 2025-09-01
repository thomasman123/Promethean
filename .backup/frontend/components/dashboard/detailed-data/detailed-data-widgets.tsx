"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, Target } from "lucide-react";
import { useDetailedDataStore } from "@/lib/dashboard/detailed-data-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface KPIWidget {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  format?: "number" | "currency" | "percentage";
  sparkline?: number[];
}

export function DetailedDataWidgets() {
  const { selectedAccountId } = useAuth();
  const { recordType, filters, viewMode } = useDetailedDataStore();
  const [widgets, setWidgets] = useState<KPIWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default widgets based on record type
  const getDefaultWidgets = (): KPIWidget[] => {
    switch (recordType) {
      case "appointments":
        return [
          {
            id: "total_appointments",
            title: "Total Appointments",
            value: 0,
            icon: Activity,
            format: "number",
          },
          {
            id: "show_rate",
            title: "Show Rate",
            value: 0,
            icon: Target,
            format: "percentage",
          },
          {
            id: "avg_lead_quality",
            title: "Avg Lead Quality",
            value: 0,
            icon: Users,
            format: "number",
          },
        ];
      case "deals":
        return [
          {
            id: "total_revenue",
            title: "Total Revenue",
            value: 0,
            icon: DollarSign,
            format: "currency",
          },
          {
            id: "close_rate",
            title: "Close Rate",
            value: 0,
            icon: Target,
            format: "percentage",
          },
          {
            id: "avg_deal_size",
            title: "Avg Deal Size",
            value: 0,
            icon: DollarSign,
            format: "currency",
          },
        ];
      case "payments":
        return [
          {
            id: "cash_collected",
            title: "Cash Collected",
            value: 0,
            icon: DollarSign,
            format: "currency",
          },
          {
            id: "payment_count",
            title: "Payments",
            value: 0,
            icon: Activity,
            format: "number",
          },
          {
            id: "refund_rate",
            title: "Refund Rate",
            value: 0,
            icon: Target,
            format: "percentage",
          },
        ];
      default:
        return [
          {
            id: "total_count",
            title: "Total Records",
            value: 0,
            icon: Activity,
            format: "number",
          },
        ];
    }
  };

  useEffect(() => {
    const loadWidgetData = async () => {
      setIsLoading(true);
      try {
        // TODO: Fetch actual data from API
        const defaultWidgets = getDefaultWidgets();
        
        // Simulate data loading with mock values
        const mockWidgets = defaultWidgets.map((widget) => ({
          ...widget,
          value: widget.format === "percentage" ? 0.75 : widget.format === "currency" ? 125000 : 342,
          change: Math.random() * 0.2 - 0.1, // -10% to +10%
          changeType: (Math.random() > 0.5 ? "positive" : "negative") as "positive" | "negative",
          sparkline: Array.from({ length: 7 }, () => Math.random() * 100),
        }));
        
        setWidgets(mockWidgets);
      } catch (error) {
        console.error("Failed to load widget data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWidgetData();
  }, [selectedAccountId, recordType, filters]);

  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === "string") return value;
    
    switch (format) {
      case "currency":
        return `$${value.toLocaleString()}`;
      case "percentage":
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const renderSparkline = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className="flex items-end gap-0.5 h-8">
        {data.map((value, i) => (
          <div
            key={i}
            className="w-1 bg-primary/20 rounded-t"
            style={{
              height: `${((value - min) / range) * 100}%`,
              minHeight: "2px",
            }}
          />
        ))}
      </div>
    );
  };

  if (viewMode === "unaggregated") {
    // Show minimal widgets for raw data view
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : "Loading..."}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {widgets.map((widget) => (
        <Card key={widget.id} className="overflow-hidden">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{widget.title}</p>
                  <widget.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {formatValue(widget.value, widget.format)}
                  </p>
                  {widget.change !== undefined && (
                    <Badge
                      variant={widget.changeType === "positive" ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        widget.changeType === "positive" && "bg-green-100 text-green-800",
                        widget.changeType === "negative" && "bg-red-100 text-red-800"
                      )}
                    >
                      {widget.changeType === "positive" ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {Math.abs(widget.change * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                
                {widget.sparkline && (
                  <div className="pt-2">
                    {renderSparkline(widget.sparkline)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 