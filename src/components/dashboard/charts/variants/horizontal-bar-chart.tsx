"use client";

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: Array<Record<string, any>>;
  dataKey?: string; // default 'value'
  nameKey?: string; // default 'name'
  color?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number | string;
}

const HorizontalBarChart = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  color = 'hsl(var(--primary))',
  showLegend = false,
  showGrid = true,
  height = '100%',
}: Props) => {
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [{ [nameKey]: 'No data', [dataKey]: 0 }];
    
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={safeData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis dataKey={nameKey} type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={120} />
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        <Bar dataKey={dataKey} name={dataKey} fill={color} />
      </ReBarChart>
    </ResponsiveContainer>
  );
};

export default HorizontalBarChart; 