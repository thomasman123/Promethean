"use client";

import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface RadarDefinition {
	dataKey: string;
	name: string;
	color?: string;
}

interface RadarChartProps {
	data: any[];
	radarSeries: RadarDefinition[];
	angleKey: string; // e.g., date
	showLegend?: boolean;
	disableTooltip?: boolean;
	className?: string;
}

export function RadarChart({
	data,
	radarSeries,
	angleKey,
	showLegend = false,
	disableTooltip = false,
	className
}: RadarChartProps) {
	const chartConfig = radarSeries.reduce((config, s, index) => {
		config[s.dataKey] = {
			label: s.name,
			color: s.color || `var(--chart-${(index % 5) + 1})`
		};
		return config;
	}, {} as Record<string, any>);

	return (
		<ChartContainer config={chartConfig} className={cn("w-full h-full aspect-auto", className)}>
			<RechartsRadarChart data={data} margin={{ top: 12, right: 16, left: 16, bottom: 8 }}>
				<PolarGrid className="stroke-muted" />
				<PolarAngleAxis dataKey={angleKey} className="text-xs fill-muted-foreground" />
				<PolarRadiusAxis className="text-xs fill-muted-foreground" />
				{!disableTooltip && (
					<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
				)}
				{showLegend && <Legend />}
				{radarSeries.map((s) => (
					<Radar
						key={s.dataKey}
						name={s.name}
						dataKey={s.dataKey}
						stroke={`var(--color-${s.dataKey}, var(--primary))`}
						fill={`var(--color-${s.dataKey}, var(--primary))`}
						fillOpacity={0.3}
						strokeWidth={2}
					/>
				))}
			</RechartsRadarChart>
		</ChartContainer>
	);
} 