"use client";

import { ResponsiveContainer, AreaChart as ReAreaChart, Area, Tooltip } from 'recharts';

interface Props {
  data: Array<{ value: number; date?: string }>; // simple
  color?: string;
  height?: number;
}

const SparklineChart = ({ data, color = 'hsl(var(--primary))', height = 80 }: Props) => {
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [{ value: 0 }];
    
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={safeData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} />
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-1 text-xs px-2 py-1" />} />
      </ReAreaChart>
    </ResponsiveContainer>
  );
};

export default SparklineChart; 