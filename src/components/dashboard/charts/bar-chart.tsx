"use client";

import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface BarDefinition {
	dataKey: string;
	name: string;
	color?: string;
}

interface BarChartProps {
	data: any[];
	bars: BarDefinition[];
	xAxisKey: string;
	xAxisType?: 'category' | 'number';
	showLegend?: boolean;
	showGrid?: boolean;
	disableTooltip?: boolean;
	className?: string;
}

export function BarChart({
	data,
	bars,
	xAxisKey,
	xAxisType = 'category',
	showLegend = false,
	showGrid = true,
	disableTooltip = false,
	className
}: BarChartProps) {
	const chartConfig = bars.reduce((config, bar, index) => {
		config[bar.dataKey] = {
			label: bar.name,
			color: bar.color || `var(--chart-${(index % 5) + 1})`
		};
		return config;
	}, {} as Record<string, any>);

	return (
		<ChartContainer config={chartConfig} className={cn("w-full h-full aspect-auto", className)}>
			<RechartsBarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
				{showGrid && (
					<CartesianGrid vertical={false} className="stroke-muted" />
				)}
				<XAxis
					dataKey={xAxisKey}
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					className="text-xs fill-muted-foreground"
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					className="text-xs fill-muted-foreground"
				/>
				{!disableTooltip && (
					<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
				)}
				{showLegend && <Legend />}
				{bars.map((bar) => (
					<Bar
						key={bar.dataKey}
						dataKey={bar.dataKey}
						fill={`var(--color-${bar.dataKey}, var(--primary))`}
						radius={8}
						isAnimationActive={false}
					/>
				))}
			</RechartsBarChart>
		</ChartContainer>
	);
} 