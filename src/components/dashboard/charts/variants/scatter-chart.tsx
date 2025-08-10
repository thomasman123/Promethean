"use client";

import { ResponsiveContainer, ScatterChart as ReScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter } from 'recharts';

interface Props {
  data: Array<{ x: number; y: number; name?: string }>;
  series: Array<{ name: string; color: string }>;
  xLabel?: string;
  yLabel?: string;
  height?: number | string;
}

const ScatterChart = ({ data, series, xLabel, yLabel, height = '100%' }: Props) => {
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [{ x: 0, y: 0, name: 'No data' }];
    
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReScatterChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="x" name="x" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis dataKey="y" name="y" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} cursor={{ strokeDasharray: '3 3' }} />
        {series.map((s, index) => (
          <Scatter key={s.name} name={s.name} data={safeData} fill={s.color} />
        ))}
      </ReScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterChart; 