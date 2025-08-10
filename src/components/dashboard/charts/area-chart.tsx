"use client";

import { 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';

interface AreaChartProps {
  data: Array<Record<string, any>>;
  areas: Array<{
    dataKey: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }>;
  xAxisKey: string;
  xAxisType?: 'date' | 'category';
  yAxisLabel?: string;
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number | string;
  disableTooltip?: boolean;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export function AreaChart({
  data,
  areas,
  xAxisKey,
  xAxisType = 'category',
  yAxisLabel,
  stacked = false,
  showGrid = true,
  showLegend = true,
  height = '100%',
  disableTooltip = false
}: AreaChartProps) {
  const chartConfig: ChartConfig = areas.reduce((acc, a) => {
    acc[a.dataKey] = { label: a.name, color: a.color };
    return acc;
  }, {} as ChartConfig);
  const formatXAxis = (value: any) => {
    if (xAxisType === 'date' && value) {
      return format(new Date(value), 'MMM dd');
    }
    return value;
  };

  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [
        areas.reduce((acc, area) => {
          acc[xAxisKey] = xAxisType === 'date' ? new Date().toISOString() : 'No data';
          acc[area.dataKey] = 0;
          return acc;
        }, {} as Record<string, any>)
      ];

  return (
    <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
      <RechartsAreaChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}
        <XAxis 
          dataKey={xAxisKey}
          tickFormatter={formatXAxis}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          label={yAxisLabel ? { 
            value: yAxisLabel, 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
          } : undefined}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        {!disableTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && (
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name}
            stroke={area.color}
            fill={area.color}
            fillOpacity={area.fillOpacity || 0.6}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
} 