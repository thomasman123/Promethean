"use client";

import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Props {
  data: Array<Record<string, any>>;
  series: Array<{ key: string; name: string; color: string }>;
  xAxisKey: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const StackedBarChart = ({ data, series, xAxisKey, height = 300, showLegend = true, showGrid = true }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis dataKey={xAxisKey} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId="stack" />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
};

export default StackedBarChart; 