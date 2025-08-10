"use client";

import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';

interface BarChartProps {
  data: Array<Record<string, any>>;
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  xAxisKey: string;
  yAxisLabel?: string;
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number | string;
  barSize?: number;
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

export function BarChart({
  data,
  bars,
  xAxisKey,
  yAxisLabel,
  stacked = false,
  showGrid = true,
  showLegend = true,
  height = '100%',
  barSize,
  disableTooltip = false
}: BarChartProps) {
  const chartConfig: ChartConfig = bars.reduce((acc, b) => {
    acc[b.dataKey] = { label: b.name, color: b.color };
    return acc;
  }, {} as ChartConfig);
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [
        bars.reduce((acc, bar) => {
          acc[xAxisKey] = 'No data';
          acc[bar.dataKey] = 0;
          return acc;
        }, {} as Record<string, any>)
      ];
  return (
    <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
      <RechartsBarChart data={safeData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}
        <XAxis 
          dataKey={xAxisKey}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          height={30}
        />
        <YAxis 
          label={yAxisLabel ? { 
            value: yAxisLabel, 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 }
          } : undefined}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          width={40}
        />
        {!disableTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && (
          <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
          />
        )}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            stackId={stacked ? "stack" : undefined}
            barSize={barSize}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
} 