"use client";

import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  innerRadius?: number; // 0 for pie, > 0 for donut
  showLegend?: boolean;
  showLabels?: boolean;
  height?: number;
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

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium">{payload[0].name}</p>
      <p className="text-sm" style={{ color: payload[0].payload.fill }}>
        Value: {payload[0].value}
      </p>
      <p className="text-xs text-muted-foreground">
        {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%
      </p>
    </div>
  );
};

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
  height = 300
}: PieChartProps) {
  // Calculate total for percentage calculation
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomLabel : false}
          outerRadius={80}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {dataWithTotal.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            verticalAlign="bottom"
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

// Donut chart is just a pie chart with inner radius
export function DonutChart(props: PieChartProps) {
  return <PieChart {...props} innerRadius={props.innerRadius || 40} />;
} 