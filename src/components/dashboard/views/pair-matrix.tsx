"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetterRepPair } from "@/lib/dashboard/types";

interface PairMatrixProps {
  setters: Array<{ id: string; name: string }>;
  reps: Array<{ id: string; name: string }>;
  pairs: SetterRepPair[];
  metric: 'appointments' | 'revenue' | 'winRate' | 'showRate';
  onCellClick?: (setterId: string, repId: string) => void;
  className?: string;
}

const formatMetricValue = (value: any, metric: string): string => {
  if (value === null || value === undefined) return '-';
  
  switch (metric) {
    case 'revenue':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    case 'winRate':
    case 'showRate':
      return `${(value * 100).toFixed(1)}%`;
    case 'appointments':
      return value.toString();
    default:
      return value.toString();
  }
};

const getMetricColor = (value: number, metric: string, avg: number): string => {
  if (!value || !avg) return '';
  
  const diff = ((value - avg) / avg) * 100;
  
  if (metric === 'revenue' || metric === 'appointments') {
    if (diff > 20) return 'text-green-600 font-semibold';
    if (diff < -20) return 'text-red-600';
  } else if (metric === 'winRate' || metric === 'showRate') {
    if (diff > 10) return 'text-green-600 font-semibold';
    if (diff < -10) return 'text-red-600';
  }
  
  return '';
};

export function PairMatrix({ 
  setters, 
  reps, 
  pairs, 
  metric, 
  onCellClick,
  className 
}: PairMatrixProps) {
  // Calculate totals and averages
  const metricLabel = {
    appointments: 'Sales Calls',
    revenue: 'Revenue',
    winRate: 'Win Rate',
    showRate: 'Show Rate'
  }[metric];

  // Create a map for quick lookup
  const pairMap = new Map<string, SetterRepPair>();
  pairs.forEach(pair => {
    const key = `${pair.setterId}-${pair.repId}`;
    pairMap.set(key, pair);
  });

  // Calculate row and column totals
  const setterTotals = new Map<string, number>();
  const repTotals = new Map<string, number>();
  let grandTotal = 0;
  let cellCount = 0;

  setters.forEach(setter => {
    let setterTotal = 0;
    reps.forEach(rep => {
      const pair = pairMap.get(`${setter.id}-${rep.id}`);
      const value = pair?.metrics?.[metric] || 0;
      setterTotal += value;
      repTotals.set(rep.id, (repTotals.get(rep.id) || 0) + value);
      if (value > 0) cellCount++;
    });
    setterTotals.set(setter.id, setterTotal);
    grandTotal += setterTotal;
  });

  const avgValue = cellCount > 0 ? grandTotal / cellCount : 0;

  // Include INBOUND if no setters selected
  const displaySetters = setters.length > 0 ? setters : [{ id: 'INBOUND', name: 'INBOUND' }];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>Setter × Rep Matrix</CardTitle>
        <CardDescription>
          {metricLabel} breakdown by setter and rep combinations
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background">
                  Setter \ Rep
                </TableHead>
                {reps.map(rep => (
                  <TableHead key={rep.id} className="text-center min-w-[100px]">
                    {rep.name}
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold bg-muted">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySetters.map(setter => (
                <TableRow key={setter.id}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {setter.name}
                  </TableCell>
                  {reps.map(rep => {
                    const pair = pairMap.get(`${setter.id}-${rep.id}`);
                    const value = pair?.metrics?.[metric] || 0;
                    return (
                      <TableCell 
                        key={rep.id} 
                        className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onCellClick?.(setter.id, rep.id)}
                      >
                        <span className={cn(getMetricColor(value, metric, avgValue))}>
                          {formatMetricValue(value, metric)}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-semibold bg-muted">
                    {formatMetricValue(setterTotals.get(setter.id) || 0, metric)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted">
                <TableCell className="sticky left-0 z-10 bg-muted">
                  Total
                </TableCell>
                {reps.map(rep => (
                  <TableCell key={rep.id} className="text-center">
                    {formatMetricValue(repTotals.get(rep.id) || 0, metric)}
                  </TableCell>
                ))}
                <TableCell className="text-center bg-muted">
                  {formatMetricValue(grandTotal, metric)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded" />
              <span>Above average (+20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded" />
              <span>Below average (-20%)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Click any cell to view detailed appointments
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 