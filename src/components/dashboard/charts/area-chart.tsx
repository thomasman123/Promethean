"use client";

import { Area, AreaChart as RechartsAreaChart, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface AreaDefinition {
	dataKey: string;
	name: string;
	color?: string;
}

interface AreaChartProps {
	data: any[];
	areas: AreaDefinition[];
	xAxisKey: string;
	xAxisType?: 'category' | 'number';
	showLegend?: boolean;
	showGrid?: boolean;
	disableTooltip?: boolean;
	className?: string;
}

export function AreaChart({
	data,
	areas,
	xAxisKey,
	xAxisType = 'category',
	showLegend = false,
	showGrid = true,
	disableTooltip = false,
	className
}: AreaChartProps) {
	const chartConfig = areas.reduce((config, a, index) => {
		config[a.dataKey] = {
			label: a.name,
			color: a.color || `var(--chart-${(index % 5) + 1})`
		};
		return config;
	}, {} as Record<string, any>);

	return (
		<ChartContainer config={chartConfig} className={cn("w-full h-full aspect-auto", className)}>
			<RechartsAreaChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
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
				{areas.map((a) => (
					<Area
						key={a.dataKey}
						type="monotone"
						dataKey={a.dataKey}
						stroke={`var(--color-${a.dataKey}, var(--primary))`}
						fill={`var(--color-${a.dataKey}, var(--primary))`}
						fillOpacity={0.28}
						strokeWidth={2}
					/>
				))}
			</RechartsAreaChart>
		</ChartContainer>
	);
} 