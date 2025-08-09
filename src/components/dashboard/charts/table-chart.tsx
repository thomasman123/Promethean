"use client";

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'badge' | 'sparkline' | 'trend';
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

interface TableChartProps {
  data: Array<Record<string, any>>;
  columns: TableColumn[];
  showRowNumbers?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  sortable?: boolean;
  className?: string;
}

// Mini sparkline component
const Sparkline = ({ data, color = 'hsl(var(--primary))' }: { data: number[], color?: string }) => {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Trend indicator component
const TrendIndicator = ({ value }: { value: number }) => {
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  
  return (
    <div className={cn("flex items-center gap-1", color)}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {value > 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
};

// Default formatters
const formatters = {
  currency: (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value),
  
  percentage: (value: number) => `${value.toFixed(1)}%`,
  
  number: (value: number) => new Intl.NumberFormat('en-US').format(value)
};

export function TableChart({
  data,
  columns,
  showRowNumbers = false,
  striped = true,
  hoverable = true,
  sortable = false,
  className
}: TableChartProps) {
  const renderCell = (row: any, column: TableColumn) => {
    const value = row[column.key];
    
    switch (column.type) {
      case 'currency':
        return formatters.currency(value);
        
      case 'percentage':
        return formatters.percentage(value);
        
      case 'number':
        return formatters.number(value);
        
      case 'badge':
        return (
          <Badge variant={value.variant || 'default'}>
            {value.label || value}
          </Badge>
        );
        
      case 'sparkline':
        return <Sparkline data={value} />;
        
      case 'trend':
        return <TrendIndicator value={value} />;
        
      default:
        return column.format ? column.format(value) : value;
    }
  };
  
  const getAlignment = (align?: string) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {showRowNumbers && <TableHead className="w-12">#</TableHead>}
            {columns.map((column) => (
              <TableHead 
                key={column.key} 
                className={cn(
                  getAlignment(column.align),
                  sortable && "cursor-pointer hover:bg-muted/50"
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index}
              className={cn(
                striped && index % 2 === 0 && "bg-muted/30",
                hoverable && "hover:bg-muted/50"
              )}
            >
              {showRowNumbers && (
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell 
                  key={column.key}
                  className={getAlignment(column.align)}
                >
                  {renderCell(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 