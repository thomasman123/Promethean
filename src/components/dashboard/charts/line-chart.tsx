"use client";

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

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
      <RechartsLineChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" />
        )}
        <XAxis 
          dataKey={xAxisKey}
          className="text-xs"
        />
        <YAxis 
          label={yAxisLabel ? { 
            value: yAxisLabel, 
            angle: -90, 
            position: 'insideLeft',
            className: 'text-xs'
          } : undefined}
          className="text-xs"
        />
        {!disableTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={`var(--color-${line.dataKey})`}
            strokeWidth={line.strokeWidth || 2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
} 