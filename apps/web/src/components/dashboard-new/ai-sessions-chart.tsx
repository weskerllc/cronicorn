"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@cronicorn/ui-library/components/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import type { AISessionTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import {
    buildChartConfigFromMappings,
    createEndpointColorMappings,
    getSanitizedKey
} from "@/lib/endpoint-colors";

interface AISessionsChartProps {
    data: Array<AISessionTimeSeriesPoint>;
    timeRange?: string;
}

export function AISessionsChart({ data, timeRange = '7d' }: AISessionsChartProps) {
    // Calculate domain bounds based on time range
    const domain = useMemo(() => {
        const now = new Date();
        const end = now.getTime();
        let start: number;

        switch (timeRange) {
            case '24h':
                start = end - 24 * 60 * 60 * 1000;
                break;
            case '7d':
                start = end - 7 * 24 * 60 * 60 * 1000;
                break;
            case '30d':
                start = end - 30 * 24 * 60 * 60 * 1000;
                break;
            case 'all':
            default:
                // For 'all', use data bounds
                return undefined;
        }

        return [start, end];
    }, [timeRange]);

    // Transform flat endpoint time-series into grouped-by-date format for Recharts
    const { chartData, endpoints, chartConfig, totalEndpoints } = useMemo(() => {
        // Calculate total sessions per endpoint to find top performers
        const endpointTotals = new Map<string, number>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointName) || 0;
            endpointTotals.set(item.endpointName, existing + item.sessionCount);
        });

        // Sort endpoints by total sessions DESC and take top 10
        const MAX_ENDPOINTS = 10;
        const sortedEndpoints = Array.from(endpointTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_ENDPOINTS)
            .map(([name]) => name);

        const endpointList = sortedEndpoints;

        // Create color mappings and chart config
        const mappings = createEndpointColorMappings(endpointList);
        const config = buildChartConfigFromMappings(mappings);

        // Group by date (only for top endpoints)
        const dateMap = new Map<string, Record<string, string | number>>();
        const endpointSet = new Set(endpointList);
        data.forEach(item => {
            // Skip endpoints not in top 10
            if (!endpointSet.has(item.endpointName)) return;
            if (!dateMap.has(item.date)) {
                // Store timestamp for X-axis domain calculation
                dateMap.set(item.date, {
                    date: new Date(item.date).getTime()
                });
            }
            const dateEntry = dateMap.get(item.date)!;
            // Use endpoint name as key for session count
            dateEntry[item.endpointName] = item.sessionCount;
        });

        // Convert to array and sort by date
        const transformedData = Array.from(dateMap.values()).sort((a, b) =>
            Number(a.date) - Number(b.date)
        );

        return {
            chartData: transformedData,
            endpoints: endpointList,
            chartConfig: config,
            totalEndpoints: endpointTotals.size,
        };
    }, [data]);

    const hasData = data.length > 0 && data.some((d) => d.sessionCount > 0);

    return (
        <Card>
            <CardHeader className="flex-row items-start pb-0">
                <div className="grid flex-1 gap-1">
                    <CardTitle>AI Sessions Timeline</CardTitle>
                    <CardDescription>
                        {hasData
                            ? totalEndpoints > endpoints.length
                                ? `Showing top ${endpoints.length} of ${totalEndpoints} endpoints by session count`
                                : `Showing AI analysis activity over the selected time period`
                            : "No AI session data available"}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {hasData ? (
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-[250px] w-full"
                    >
                        <AreaChart data={chartData}>
                            <defs>
                                {endpoints.map((endpointName) => {
                                    const sanitizedKey = getSanitizedKey(endpointName);
                                    return (
                                        <linearGradient
                                            key={endpointName}
                                            id={`fillSession${sanitizedKey}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                {...(domain && { domain, scale: "time", type: "number" })}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    });
                                }}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            {endpoints.map((endpointName) => {
                                const sanitizedKey = getSanitizedKey(endpointName);
                                return (
                                    <Area
                                        key={endpointName}
                                        dataKey={endpointName}
                                        type="natural"
                                        fill={`url(#fillSession${sanitizedKey})`}
                                        stroke={`var(--color-${sanitizedKey})`}
                                        stackId="a"
                                    />
                                );
                            })}
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                        No AI session data to display
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
