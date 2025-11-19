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
        if (item.source in SOURCE_CONFIG) {
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
    // Filter out items with 0 count
    const chartData = React.useMemo(
        () => data
            .filter(item => item.count > 0)
            .map(item => ({
                ...item,
                fill: `var(--color-${item.source})`
            })),
        [data]
    );

    // Calculate AI-driven percentage from backend data (only non-zero counts)
    const totalRuns = data.filter(item => item.count > 0).reduce((sum, item) => sum + item.count, 0);
    const aiRuns = data
        .filter(item => item.source.startsWith('ai-') && item.count > 0)
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
                        {hasData && <ChartTooltip 
                            cursor={false} 
                            content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                // Filter out items with 0 count
                                const filteredPayload = payload.filter(item => 
                                    item.value != null && Number(item.value) > 0
                                );
                                if (filteredPayload.length === 0) return null;
                                return <ChartTooltipContent hideLabel active={active} payload={filteredPayload} />;
                            }}
                        />}
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
                    .filter(item => item.count > 0)
                    .map((item) => {
                        const config = chartConfig[item.source];
                        // Type system guarantees config exists from buildChartConfig
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