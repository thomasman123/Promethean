"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, TrendingDown, Award, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetterMetrics, RepMetrics } from "@/lib/dashboard/metrics-calculator";

interface LeaderboardProps {
  type: 'setter' | 'rep';
  data: SetterMetrics[] | RepMetrics[];
  metric: string;
  className?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Award className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-orange-600" />;
    default:
      return <span className="w-5 text-center text-sm font-medium">{rank}</span>;
  }
};

const formatValue = (value: number, metric: string): string => {
  switch (metric) {
    case 'revenue':
    case 'attributedRevenue':
    case 'cashCollected':
    case 'avgOrderValue':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    case 'showRate':
    case 'setterWinRate':
    case 'winRate':
      return `${(value * 100).toFixed(1)}%`;
    case 'avgSalesCycle':
      return `${value.toFixed(1)} days`;
    default:
      return value.toLocaleString();
  }
};

export function Leaderboard({ type, data, metric, className }: LeaderboardProps) {
  // Sort data by selected metric
  const sortedData = [...data].sort((a, b) => {
    const aValue = (a as any)[metric] || 0;
    const bValue = (b as any)[metric] || 0;
    return bValue - aValue;
  });
  
  // Calculate max value for progress bars
  const maxValue = Math.max(...sortedData.map(d => (d as any)[metric] || 0));
  
  // Get metric display name
  const metricLabels: Record<string, string> = {
    // Setter metrics
    outboundDials: 'Outbound Dials',
    uniqueContactsReached: 'Unique Contacts',
    discoveriesSet: 'Discoveries',
    salesCallsBooked: 'Sales Calls Booked',
    showRate: 'Show Rate',
    setterWinRate: 'Win Rate',
    attributedRevenue: 'Attributed Revenue',
    // Rep metrics
    salesCallsHeld: 'Sales Calls Held',
    winRate: 'Win Rate',
    revenue: 'Revenue',
    cashCollected: 'Cash Collected',
    avgOrderValue: 'Avg Order Value',
    avgSalesCycle: 'Avg Sales Cycle'
  };
  
  const metricLabel = metricLabels[metric] || metric;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {type === 'setter' ? 'Setter' : 'Rep'} Leaderboard
        </CardTitle>
        <CardDescription>
          Ranked by {metricLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">{metricLabel}</TableHead>
              <TableHead className="w-[200px]">Progress</TableHead>
              {type === 'setter' && (
                <>
                  <TableHead className="text-center">Calls</TableHead>
                  <TableHead className="text-center">Bookings</TableHead>
                </>
              )}
              {type === 'rep' && (
                <>
                  <TableHead className="text-center">Held</TableHead>
                  <TableHead className="text-center">Win %</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => {
              const rank = index + 1;
              const value = (item as any)[metric] || 0;
              const progress = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <TableRow 
                  key={type === 'setter' 
                    ? (item as SetterMetrics).setterId 
                    : (item as RepMetrics).repId
                  }
                  className={cn(
                    rank <= 3 && "bg-muted/30",
                    "hover:bg-muted/50"
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {type === 'setter' 
                      ? (item as SetterMetrics).setterName 
                      : (item as RepMetrics).repName
                    }
                    {(item as any).setterId === 'INBOUND' && (
                      <Badge variant="secondary" className="ml-2">Inbound</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatValue(value, metric)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  {type === 'setter' && (
                    <>
                      <TableCell className="text-center text-sm">
                        {(item as SetterMetrics).outboundDials}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {(item as SetterMetrics).salesCallsBooked}
                      </TableCell>
                    </>
                  )}
                  {type === 'rep' && (
                    <>
                      <TableCell className="text-center text-sm">
                        {(item as RepMetrics).salesCallsHeld}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatValue((item as RepMetrics).winRate, 'winRate')}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {/* Summary Stats */}
        <div className="p-4 border-t bg-muted/30">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total {type === 'setter' ? 'Setters' : 'Reps'}</p>
              <p className="font-semibold">{sortedData.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Average {metricLabel}</p>
              <p className="font-semibold">
                {formatValue(
                  sortedData.reduce((sum, d) => sum + ((d as any)[metric] || 0), 0) / sortedData.length,
                  metric
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Top Performer</p>
              <p className="font-semibold">
                {type === 'setter' 
                  ? (sortedData[0] as SetterMetrics)?.setterName 
                  : (sortedData[0] as RepMetrics)?.repName
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 