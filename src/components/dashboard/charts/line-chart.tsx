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
  const chartConfig = lines.reduce((config, line, index) => {
    config[line.dataKey] = {
      label: line.name,
      color: line.color || `hsl(var(--chart-${(index % 5) + 1}))`
    };
    return config;
  }, {} as Record<string, any>);

  return (
    <ChartContainer config={chartConfig} className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 5,
          }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          )}
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
          />
          {!disableTooltip && (
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
          )}
          {showLegend && <Legend />}
                  {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4, fill: line.color }}
            activeDot={{ r: 6, fill: line.color }}
          />
        ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
} 