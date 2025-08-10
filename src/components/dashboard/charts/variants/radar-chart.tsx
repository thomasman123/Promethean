"use client";

import { ResponsiveContainer, RadarChart as ReRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';

interface Props {
  data: Array<Record<string, any>>;
  categoryKey: string; // axis labels
  series: Array<{ key: string; name: string; color: string }>;
  height?: number | string;
}

const RadarChart = ({ data, categoryKey, series, height = '100%' }: Props) => {
  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [series.reduce((acc, s) => {
        acc[categoryKey] = 'No data';
        acc[s.key] = 0;
        return acc;
      }, {} as Record<string, any>)];
      
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadarChart data={safeData} cx="50%" cy="50%" outerRadius="80%">
        <PolarGrid />
        <PolarAngleAxis dataKey={categoryKey} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <PolarRadiusAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        {series.map((s) => (
          <Radar key={s.key} name={s.name} dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.3} />
        ))}
        <Tooltip content={<div className="bg-background border rounded-lg shadow-lg p-2 text-sm" />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </ReRadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChart; 