"use client";

import { Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface LineDefinition {
	dataKey: string;
	name: string;
	color: string;
}

interface LineChartProps {
	data: any[];
	lines: LineDefinition[];
	xAxisKey: string;
	xAxisType?: 'category' | 'number';
	showLegend?: boolean;
	showGrid?: boolean;
	disableTooltip?: boolean;
	className?: string;
}

export function LineChart({
	data,
	lines,
	xAxisKey,
	xAxisType = 'category',
	showLegend = false,
	showGrid = true,
	disableTooltip = false,
	className
}: LineChartProps) {
	const chartConfig = lines.reduce((config, line, index) => {
		config[line.dataKey] = {
			label: line.name,
			color: line.color || `var(--chart-${(index % 5) + 1})`
		};
		return config;
	}, {} as Record<string, any>);

	return (
		<ChartContainer config={chartConfig} className={cn("w-full h-full aspect-auto", className)}>
			<RechartsLineChart
				data={data}
				margin={{
					top: 12,
					right: 16,
					left: 8,
					bottom: 8,
				}}
			>
				{showGrid && (
					<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
				)}
				<XAxis
					dataKey={xAxisKey}
					tickLine={false}
					axisLine={false}
					className="text-xs fill-muted-foreground"
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					className="text-xs fill-muted-foreground"
				/>
				{!disableTooltip && (
					<ChartTooltip content={<ChartTooltipContent />} />
				)}
				{showLegend && <Legend />}
				{lines.map((line) => (
					<Line
						key={line.dataKey}
						type="monotone"
						dataKey={line.dataKey}
						stroke={`var(--color-${line.dataKey}, var(--primary))`}
						strokeWidth={2.5}
						dot={{ r: 4, fill: `var(--color-${line.dataKey}, var(--primary))` }}
						activeDot={{ r: 6, stroke: 'var(--background)', strokeWidth: 2 }}
						connectNulls={true}
					/>
				))}
			</RechartsLineChart>
		</ChartContainer>
	);
} 