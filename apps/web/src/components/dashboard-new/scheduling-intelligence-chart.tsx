"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import { DashboardCard } from "./dashboard-card";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import type { SourceDistributionItem } from "@cronicorn/api-contracts/dashboard";

const chartConfig = {
    runs: {
        label: "Runs",
    },
    "baseline-cron": {
        label: "Baseline (Cron)",
        color: "var(--chart-3)",
    },
    "baseline-interval": {
        label: "Baseline (Interval)",
        color: "var(--chart-5)",
    },
    "ai-interval": {
        label: "AI Interval",
        color: "var(--chart-2)",
    },
    "ai-oneshot": {
        label: "AI One-Shot",
        color: "var(--chart-2)",
    },
    "clamped-min": {
        label: "Clamped (Min)",
        color: "var(--chart-4)",
    },
    "clamped-max": {
        label: "Clamped (Max)",
        color: "var(--chart-4)",
    },
    paused: {
        label: "Paused",
        color: "var(--muted-foreground)",
    },
    unknown: {
        label: "Unknown",
        color: "var(--muted-foreground)",
    },
} satisfies ChartConfig;

interface SchedulingIntelligenceChartProps {
    data: Array<SourceDistributionItem>;
}

export function SchedulingIntelligenceChart({
    data,
}: SchedulingIntelligenceChartProps) {
    const id = "scheduling-intelligence";

    // Transform data to add fill property for each source
    // Only include sources that exist in chartConfig to avoid rendering issues
    const chartData = React.useMemo(
        () => data
            .filter(item => item.source in chartConfig)
            .map(item => ({
                ...item,
                fill: `var(--color-${item.source})`
            })),
        [data]
    );

    // Calculate AI-driven percentage from backend data
    const totalRuns = data.reduce((sum, item) => sum + item.count, 0);
    const aiRuns = data
        .filter(item => item.source.startsWith('ai-'))
        .reduce((sum, item) => sum + item.count, 0);
    const aiDrivenPct = totalRuns > 0 ? (aiRuns / totalRuns) * 100 : 0;

    const hasData = data.length > 0;

    return (
        <DashboardCard
            title="Scheduling Intelligence"
            description={hasData ? "Distribution of scheduling sources (read-only)" : "No data to display"}
            contentClassName="flex gap-4 p-3"
        >
            <div className="flex-auto flex items-center justify-center">
                <ChartContainer
                    id={id}
                    config={chartConfig}
                    className="aspect-square h-full max-h-full"
                >
                    <PieChart>
                        {hasData && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />}
                        <Pie
                            data={hasData ? chartData : []}
                            dataKey="count"
                            nameKey="source"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {hasData ? aiDrivenPct.toFixed(0) : '0'}%
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    AI-Driven
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </div>
            <div className="flex flex-col flex-1 items-center gap-2 justify-center flex-wrap">
                {hasData ? data.map((item) => {
                    // Check if source exists in chartConfig before accessing
                    if (!(item.source in chartConfig)) return null;
                    const config = chartConfig[item.source as keyof typeof chartConfig];
                    // Skip rendering if config doesn't have a color property
                    if (typeof config !== 'object' || !('color' in config)) return null;
                    return (
                        <div key={item.source} className="flex items-center gap-1.5 text-xs">
                            <div
                                className="h-2 w-2 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: config.color }}
                            />
                            <span className="text-nowrap">{config.label}</span>
                        </div>
                    );
                }) : null}
            </div>
        </DashboardCard>
    );
}