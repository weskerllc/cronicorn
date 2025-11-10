"use client";

import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@cronicorn/ui-library/components/card";
import {
    ChartContainer,
    ChartStyle,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@cronicorn/ui-library/components/select";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
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
    onSourceClick?: (source: string) => void;
    selectedSource?: string | null;
}

export function SchedulingIntelligenceChart({
    data,
    onSourceClick,
    selectedSource,
}: SchedulingIntelligenceChartProps) {
    const id = "scheduling-intelligence";

    // Transform data to add fill property for each source
    const chartData = React.useMemo(
        () => data.map(item => ({
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

    const [activeSource, setActiveSource] = React.useState(data[0]?.source);

    const activeIndex = React.useMemo(
        () => chartData.findIndex((item) => item.source === (selectedSource || activeSource)),
        [chartData, selectedSource, activeSource]
    );

    const sources = React.useMemo(() => chartData.map((item) => item.source), [chartData]);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Scheduling Intelligence</CardTitle>
                    <CardDescription>No scheduling data available</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
                    <p>No runs found to display scheduling sources</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card data-chart={id} className="flex flex-col">
            <ChartStyle id={id} config={chartConfig} />
            <CardHeader className="flex-row items-start space-y-0 pb-0">
                <div className="grid gap-1">
                    <CardTitle>Scheduling Intelligence</CardTitle>
                    <CardDescription>
                        How your system is being scheduled
                    </CardDescription>
                </div>
                <Select
                    value={selectedSource || activeSource}
                    onValueChange={(value) => {
                        setActiveSource(value);
                        onSourceClick?.(value);
                    }}
                >
                    <SelectTrigger
                        className="ml-auto h-7 w-40 rounded-lg pl-2.5"
                        aria-label="Select a source"
                    >
                        <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl">
                        {sources.map((key) => {
                            const config = chartConfig[key as keyof typeof chartConfig];

                            return (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    className="rounded-lg [&_span]:flex"
                                >
                                    <div className="flex items-center gap-2 text-xs">
                                        <span
                                            className="flex h-3 w-3 shrink-0 rounded-xs"
                                            style={{
                                                backgroundColor: `var(--color-${key})`,
                                            }}
                                        />
                                        {config.label}
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
                <ChartContainer
                    id={id}
                    config={chartConfig}
                    className="mx-auto aspect-square w-full max-w-[300px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="source"
                            innerRadius={60}
                            strokeWidth={5}
                            activeIndex={activeIndex}
                            onClick={(dataPoint) => {
                                setActiveSource(dataPoint.source);
                                onSourceClick?.(dataPoint.source);
                            }}
                            cursor="pointer"
                            activeShape={({
                                outerRadius = 0,
                                ...props
                            }: PieSectorDataItem) => (
                                <g>
                                    <Sector {...props} outerRadius={outerRadius + 10} />
                                    <Sector
                                        {...props}
                                        outerRadius={outerRadius + 25}
                                        innerRadius={outerRadius + 12}
                                    />
                                </g>
                            )}
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
                                                    {aiDrivenPct.toFixed(0)}%
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
            </CardContent>
        </Card>
    );
}
