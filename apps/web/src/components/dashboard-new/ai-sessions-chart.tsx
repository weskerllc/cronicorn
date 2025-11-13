"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import { DashboardCard } from "./dashboard-card";
import type { AISessionTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import { getSanitizedKey } from "@/lib/endpoint-colors";

interface AISessionsChartProps {
    data: Array<AISessionTimeSeriesPoint>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    timeRange?: string;
}

export function AISessionsChart({ data, chartConfig, timeRange = '7d' }: AISessionsChartProps) {
    // Transform flat endpoint time-series into grouped-by-date format for Recharts
    const { chartData, endpoints, totalEndpoints } = useMemo(() => {
        // Calculate total sessions per endpoint to find top performers
        const endpointTotals = new Map<string, number>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointName) || 0;
            endpointTotals.set(item.endpointName, existing + item.sessionCount);
        });

        // Sort endpoints by total sessions DESC and take top 10 for display
        const MAX_ENDPOINTS = 10;
        const sortedEndpoints = Array.from(endpointTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_ENDPOINTS)
            .map(([name]) => name);

        const endpointList = sortedEndpoints;

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
            totalEndpoints: endpointTotals.size,
        };
    }, [data]);

    const hasData = data.length > 0 && data.some((d) => d.sessionCount > 0);

    // Calculate total sessions
    const totalSessions = useMemo(() => {
        return data.reduce((sum, point) => sum + point.sessionCount, 0);
    }, [data]);

    const description = hasData ? (
        <>
            <p>
                Sessions: <span className="text-foreground font-medium">{totalSessions.toLocaleString()}</span>
                {totalEndpoints > endpoints.length && (
                    <span className="text-muted-foreground text-xs ml-2">
                        (Showing top {endpoints.length} of {totalEndpoints} endpoints)
                    </span>
                )}
            </p>
        </>
    ) : (
        "No data to display"
    );

    return (
        <DashboardCard
            title="AI Sessions Timeline"
            description={description}
            contentClassName="p-3"
        >
            {hasData ? (
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-full w-full"
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
                        <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={true}
                            tickMargin={8}
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            ticks={[chartData[0]?.date, chartData[chartData.length - 1]?.date].filter(Boolean)}
                            tickFormatter={(value) => {
                                const date = new Date(Number(value));
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                });
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.toLocaleString()}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;
                                const date = new Date(Number(payload[0]?.payload?.date));
                                return (
                                    <ChartTooltipContent
                                        active={active}
                                        payload={payload}
                                        label={date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                        indicator="dot"
                                    />
                                );
                            }}
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
                    </AreaChart>
                </ChartContainer>
            ) : null}

        </DashboardCard>
    );
}
