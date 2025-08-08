"use client";

import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

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
  height?: number;
  barSize?: number;
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
  height = 300,
  barSize
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        )}
        <XAxis 
          dataKey={xAxisKey}
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
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
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
    </ResponsiveContainer>
  );
} 