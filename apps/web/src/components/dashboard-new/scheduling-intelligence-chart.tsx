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

// Default color mappings for known source types
const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
    "baseline-cron": {
        label: "Baseline (Cron)",
        color: "var(--source-baseline-cron)",
    },
    "baseline-interval": {
        label: "Baseline (Interval)",
        color: "var(--source-baseline-interval)",
    },
    "ai-interval": {
        label: "AI Interval",
        color: "var(--source-ai-interval)",
    },
    "ai-oneshot": {
        label: "AI One-Shot",
        color: "var(--source-ai-oneshot)",
    },
    "clamped-min": {
        label: "Clamped (Min)",
        color: "var(--source-clamped-min)",
    },
    "clamped-max": {
        label: "Clamped (Max)",
        color: "var(--source-clamped-max)",
    },
    paused: {
        label: "Paused",
        color: "var(--source-paused)",
    },
    unknown: {
        label: "Unknown",
        color: "var(--muted-foreground)",
    },
};

// Chart colors to cycle through for unknown sources
const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

/**
 * Dynamically builds a ChartConfig from the data sources
 * Uses predefined configs for known sources, generates configs for unknown ones
 */
function buildChartConfig(data: Array<SourceDistributionItem>): ChartConfig {
    const config: ChartConfig = {
        runs: { label: "Runs" },
    };

    data.forEach((item, index) => {
        // Ensure item and item.source are valid
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!item || !item.source || typeof item.source !== "string") {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (SOURCE_CONFIG[item.source]) {
            // Use predefined config for known sources
            config[item.source] = SOURCE_CONFIG[item.source];
        } else {
            // Generate config for unknown sources
            const colorIndex = index % CHART_COLORS.length;
            config[item.source] = {
                label: item.source
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                color: CHART_COLORS[colorIndex],
            };
        }
    });

    return config;
}

interface SchedulingIntelligenceChartProps {
    data: Array<SourceDistributionItem>;
}

export function SchedulingIntelligenceChart({
    data,
}: SchedulingIntelligenceChartProps) {
    const id = "scheduling-intelligence";

    // Dynamically build chart config from incoming data
    const chartConfig = React.useMemo(() => buildChartConfig(data), [data]);

    // Transform data to add fill property for each source
    const chartData = React.useMemo(
        () => data
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            .filter(item => item && item.source && typeof item.source === "string")
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
                {hasData ? data
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    .filter(item => item && item.source && typeof item.source === "string")
                    .map((item) => {
                        const config = chartConfig[item.source];
                        // Skip if config doesn't have a color (shouldn't happen with dynamic config)
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (!config || typeof config !== 'object' || !('color' in config) || !config.color) return null;
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