"use client";

import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  Tooltip, 
  Legend
} from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';

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

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  innerRadius?: number; // 0 for pie, > 0 for donut
  showLegend?: boolean;
  showLabels?: boolean;
  height?: number | string;
  disableTooltip?: boolean;
}

// Default color palette
const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(346, 84%, 61%)',
  'hsl(142, 71%, 45%)',
  'hsl(215, 70%, 50%)',
  'hsl(47, 85%, 63%)',
  'hsl(280, 70%, 50%)',
  'hsl(20, 70%, 50%)',
  'hsl(170, 70%, 50%)',
];

// Custom label
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PieChart({
  data,
  innerRadius = 0,
  showLegend = true,
  showLabels = true,
  height = '100%',
  disableTooltip = false
}: PieChartProps) {
  const chartConfig: ChartConfig = (Array.isArray(data) ? data : []).reduce((acc, d: any) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as ChartConfig);
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'
  ];

  const safeData = Array.isArray(data) && data.length > 0
    ? data
    : [{ name: 'No data', value: 0 }];

  return (
    <ChartContainer config={chartConfig} className="w-full h-full min-h-[200px]">
      <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={safeData}
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
          label={showLabels ? ({
            cx, cy, midAngle, innerRadius, outerRadius, percent
          }) => {
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);

            return (
              <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central"
                fontSize="10"
                fontWeight="500"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          } : false}
        >
          {safeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        {!disableTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && (
          <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
            iconSize={8}
          />
        )}
      </RechartsPieChart>
    </ChartContainer>
  );
}

// Donut chart is just a pie chart with inner radius
export function DonutChart(props: PieChartProps) {
  return <PieChart {...props} innerRadius={60} />;
} 