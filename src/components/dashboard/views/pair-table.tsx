"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SetterRepPair } from "@/lib/dashboard/types";

interface PairTableProps {
  pairs: SetterRepPair[];
  onPairClick?: (setterId: string, repId: string) => void;
  className?: string;
}

type SortKey = 'setter' | 'rep' | 'appointments' | 'revenue' | 'winRate' | 'showRate';
type SortOrder = 'asc' | 'desc';

export function PairTable({ pairs, onPairClick, className }: PairTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedPairs = useMemo(() => {
    return [...pairs].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortKey) {
        case 'setter':
          aVal = a.setterName.toLowerCase();
          bVal = b.setterName.toLowerCase();
          break;
        case 'rep':
          aVal = a.repName.toLowerCase();
          bVal = b.repName.toLowerCase();
          break;
        case 'appointments':
        case 'revenue':
        case 'winRate':
        case 'showRate':
          aVal = a.metrics?.[sortKey] || 0;
          bVal = b.metrics?.[sortKey] || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pairs, sortKey, sortOrder]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const SortButton = ({ column, children }: { column: SortKey; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>Setter × Rep Performance</CardTitle>
        <CardDescription>
          Detailed metrics for each setter and rep combination
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="setter">Setter</SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="rep">Sales Rep</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="appointments">Sales Calls</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="showRate">Show Rate</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="winRate">Win Rate</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="revenue">Revenue</SortButton>
              </TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPairs.map((pair, index) => {
              const isInbound = pair.setterId === 'INBOUND';
              return (
                <TableRow 
                  key={`${pair.setterId}-${pair.repId}`}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    index % 2 === 0 && "bg-muted/20"
                  )}
                  onClick={() => onPairClick?.(pair.setterId, pair.repId)}
                >
                  <TableCell className="font-medium">
                    {isInbound ? (
                      <Badge variant="secondary">{pair.setterName}</Badge>
                    ) : (
                      pair.setterName
                    )}
                  </TableCell>
                  <TableCell>{pair.repName}</TableCell>
                  <TableCell className="text-right">
                    {pair.metrics?.appointments || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {pair.metrics?.showRate 
                      ? formatPercentage(pair.metrics.showRate)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {pair.metrics?.winRate 
                      ? formatPercentage(pair.metrics.winRate)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {pair.metrics?.revenue 
                      ? formatCurrency(pair.metrics.revenue)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPairClick?.(pair.setterId, pair.repId);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Stats */}
        <div className="p-4 border-t bg-muted/30">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Pairs</p>
              <p className="font-semibold">{pairs.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Sales Calls</p>
              <p className="font-semibold">
                {pairs.reduce((sum, p) => sum + (p.metrics?.appointments || 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Win Rate</p>
              <p className="font-semibold">
                {formatPercentage(
                  pairs.reduce((sum, p) => sum + (p.metrics?.winRate || 0), 0) / pairs.length
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Revenue</p>
              <p className="font-semibold">
                {formatCurrency(
                  pairs.reduce((sum, p) => sum + (p.metrics?.revenue || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 