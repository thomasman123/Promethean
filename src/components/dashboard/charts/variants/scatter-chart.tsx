"use client";

import { ResponsiveContainer, ScatterChart as ReScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter } from 'recharts';

interface Props {
  data: Array<{ x: number; y: number; name?: string }>; // simple
  color?: string;
  height?: number;
}

const ScatterChart = ({ data, color = 'hsl(var(--primary))', height = 300 }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReScatterChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="x" name="x" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis dataKey="y" name="y" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} />
        <Scatter data={data} fill={color} />
      </ReScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterChart; 