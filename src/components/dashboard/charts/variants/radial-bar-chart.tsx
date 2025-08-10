"use client";

import { ResponsiveContainer, RadialBarChart as ReRadialBarChart, RadialBar, Legend, Tooltip } from 'recharts';

interface Props {
  data: Array<{ name: string; value: number; fill?: string }>;
  height?: number | string;
}

const RadialBarChart = ({ data, height = '100%' }: Props) => {
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [{ name: 'No data', value: 0, fill: 'hsl(var(--primary))' }];
    
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={safeData}>
        <RadialBar dataKey="value" />
        <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0 }} />
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} />
      </ReRadialBarChart>
    </ResponsiveContainer>
  );
};

export default RadialBarChart; 