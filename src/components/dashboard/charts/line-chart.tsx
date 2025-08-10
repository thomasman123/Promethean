"use client";

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';

interface LineChartProps {
  data: Array<Record<string, any>>;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }>;
  xAxisKey: string;
  xAxisType?: 'date' | 'category';
  yAxisLabel?: string;
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

export function LineChart({
  data,
  lines,
  xAxisKey,
  xAxisType = 'category',
  yAxisLabel,
  showGrid = true,
  showLegend = true,
  height = '100%',
  disableTooltip = false
}: LineChartProps) {
  // Create chart config from lines
  const chartConfig: ChartConfig = lines.reduce((acc, line) => {
    acc[line.dataKey] = {
      label: line.name,
      color: line.color,
    };
    return acc;
  }, {} as ChartConfig);

  // Ensure we have data to render
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [
        lines.reduce((acc, line) => {
          acc[xAxisKey] = xAxisType === 'date' ? new Date().toISOString() : 'No data';
          acc[line.dataKey] = 0;
          return acc;
        }, {} as Record<string, any>)
      ];

  return (
    <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
      <RechartsLineChart data={safeData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}
        <XAxis 
          dataKey={xAxisKey}
          type={xAxisType === 'date' ? 'number' : 'category'}
          scale={xAxisType === 'date' ? 'time' : undefined}
          domain={xAxisType === 'date' ? ['dataMin', 'dataMax'] : undefined}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          height={30}
          tickFormatter={xAxisType === 'date' 
            ? (value) => new Date(value).toLocaleDateString()
            : undefined
          }
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
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 4, stroke: line.color, strokeWidth: 2 }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
} 