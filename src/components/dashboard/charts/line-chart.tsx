"use client";

import { Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface LineDefinition {
  dataKey: string;
  name: string;
  color: string;
}

interface LineChartProps {
  data: any[];
  lines: LineDefinition[];
  xAxisKey: string;
  xAxisType?: 'category' | 'number';
  showLegend?: boolean;
  showGrid?: boolean;
  disableTooltip?: boolean;
  className?: string;
}

export function LineChart({
  data,
  lines,
  xAxisKey,
  xAxisType = 'category',
  showLegend = false,
  showGrid = true,
  disableTooltip = false,
  className
}: LineChartProps) {
  console.log('🐛 DEBUG - LineChart props:', { data, lines, xAxisKey });
  
  const chartConfig = lines.reduce((config, line, index) => {
    config[line.dataKey] = {
      label: line.name,
      color: line.color || `hsl(var(--chart-${(index % 5) + 1}))`
    };
    return config;
  }, {} as Record<string, any>);

    return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            left: 20,
            bottom: 20,
          }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
          />
          {!disableTooltip && (
            <Tooltip />
          )}
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6", stroke: "#3b82f6", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
              connectNulls={true}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
} 