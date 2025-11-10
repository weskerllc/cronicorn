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
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import type { EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import {
    buildChartConfigFromMappings,
    createEndpointColorMappings,
    getSanitizedKey
} from "@/lib/endpoint-colors";

interface ExecutionTimelineChartProps {
    data: Array<EndpointTimeSeriesPoint>;
    timeRange?: string;
}

export function ExecutionTimelineChart({
    data,
    timeRange = '7d',
}: ExecutionTimelineChartProps) {
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
        // Calculate total runs per endpoint to find top performers
        const endpointTotals = new Map<string, number>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointName) || 0;
            endpointTotals.set(item.endpointName, existing + item.success + item.failure);
        });

        // Sort endpoints by total runs DESC and take top 10
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
                dateMap.set(item.date, { date: new Date(item.date).getTime() });
            }
            const dateEntry = dateMap.get(item.date)!;
            // Use endpoint name as key, combine success + failure for total runs
            dateEntry[item.endpointName] = item.success + item.failure;
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

    const hasData = data.some(point => point.success > 0 || point.failure > 0);

    return (
        <Card>
            <CardHeader className="flex-row items-start space-y-0 pb-0">
                <div className="grid gap-1">
                    <CardTitle>Execution Timeline by Endpoint</CardTitle>
                    <CardDescription>
                        {hasData
                            ? totalEndpoints > endpoints.length
                                ? `Showing top ${endpoints.length} of ${totalEndpoints} endpoints by run count`
                                : "Run activity over time grouped by endpoint"
                            : "No executions in selected time range"}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
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
                                        id={`fill${sanitizedKey}`}
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
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        {endpoints.map((endpointName) => {
                            const sanitizedKey = getSanitizedKey(endpointName);
                            return (
                                <Area
                                    key={endpointName}
                                    dataKey={endpointName}
                                    type="natural"
                                    fill={`url(#fill${sanitizedKey})`}
                                    stroke={`var(--color-${sanitizedKey})`}
                                    stackId="a"
                                />
                            );
                        })}
                        {/* <ChartLegend content={<ChartLegendContent />} /> */}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}