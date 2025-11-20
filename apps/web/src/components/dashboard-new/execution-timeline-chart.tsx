"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@cronicorn/ui-library/components/chart";
import { DashboardCard } from "./dashboard-card";
import type { EndpointTimeSeriesPoint } from "@cronicorn/api-contracts/dashboard";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import type { TimeRangeValue } from "@/lib/time-range-labels";
import { getSanitizedKey } from "@/lib/endpoint-colors";
import { getTimeRangeEndLabel, getTimeRangeStartLabel } from "@/lib/time-range-labels";

interface ExecutionTimelineChartProps {
    data: Array<EndpointTimeSeriesPoint>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    /** Selected time range for label display */
    timeRange?: TimeRangeValue;
    /** Pre-calculated maximum stacked value from server (includes 10% padding) */
    maxStackedValue?: number;
}

export function ExecutionTimelineChart({
    data,
    chartConfig,
    timeRange,
    maxStackedValue: serverMaxStackedValue,
}: ExecutionTimelineChartProps) {
    // Transform flat endpoint time-series into grouped-by-date format for Recharts
    const { chartData, endpoints, totalEndpoints } = useMemo(() => {
        // Calculate total runs per endpoint to find top performers
        const endpointTotals = new Map<string, { id: string; name: string; total: number }>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointId);
            if (existing) {
                existing.total += item.success + item.failure;
            } else {
                endpointTotals.set(item.endpointId, { id: item.endpointId, name: item.endpointName, total: item.success + item.failure });
            }
        });

        // Sort endpoints by total runs DESC and take top 10 for display
        const MAX_ENDPOINTS = 10;
        const sortedEndpoints = Array.from(endpointTotals.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, MAX_ENDPOINTS)
            .map(ep => ({ id: ep.id, name: ep.name }));

        const endpointList = sortedEndpoints;

        // Group by date (only for top endpoints)
        const dateMap = new Map<string, Record<string, string | number>>();
        const endpointSet = new Set(endpointList.map(ep => ep.name));
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
            totalEndpoints: endpointTotals.size,
        };
    }, [data]);

    const hasData = data.some(point => point.success > 0 || point.failure > 0);

    // Calculate total invocations
    const totalInvocations = useMemo(() => {
        return data.reduce((sum, point) => sum + point.success + point.failure, 0);
    }, [data]);

    // Use server-provided max stacked value, or calculate client-side as fallback
    const maxStackedValue = useMemo(() => {
        // Prefer server-calculated value for better performance
        if (serverMaxStackedValue !== undefined && serverMaxStackedValue > 0) {
            return serverMaxStackedValue;
        }

        // Fallback: calculate client-side (for backward compatibility)
        if (chartData.length === 0) return 0;

        // For each data point, sum all endpoint values to get the stacked total
        const maxValue = chartData.reduce((max, dataPoint) => {
            const stackedTotal = endpoints.reduce((sum, endpoint) => {
                const value = dataPoint[endpoint.name];
                return sum + (typeof value === 'number' ? value : 0);
            }, 0);
            return Math.max(max, stackedTotal);
        }, 0);

        // Add 10% padding to prevent touching the top
        return maxValue * 1.1;
    }, [serverMaxStackedValue, chartData, endpoints]);

    const description = hasData ? (
        <>
            <p>
                Invocations: <span className="text-foreground font-medium">{totalInvocations.toLocaleString()}</span>
                {totalEndpoints > endpoints.length && (
                    <span className="text-muted-foreground text-xs ml-2">
                        (Showing top {endpoints.length} of {totalEndpoints})
                    </span>
                )}
            </p>
        </>
    ) : (
        "No data to display"
    );

    return (
        <DashboardCard
            title="Endpoint Activity"
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
                            {endpoints
                                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                .filter(ep => ep && ep.name && typeof ep.name === "string")
                                .map((endpoint) => {
                                    const endpointName = endpoint.name;
                                    const sanitizedKey = getSanitizedKey(endpointName);
                                    if (!sanitizedKey) return null;
                                    return (
                                        <linearGradient
                                            key={endpoint.id}
                                            id={`fill-${endpoint.id}`}
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
                            ticks={chartData.length >= 2 ? [chartData[0].date as number, chartData[chartData.length - 1].date as number] : undefined}
                            tickFormatter={(_value, index) => {
                                // Show start label on left, end label on right
                                if (index === 0) {
                                    return getTimeRangeStartLabel(timeRange);
                                }
                                return getTimeRangeEndLabel();
                            }}
                        />
                        <YAxis
                            domain={[0, maxStackedValue || 'auto']}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.toLocaleString()}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null;

                                // Filter out zero values from tooltip
                                const filteredPayload = payload.filter(item => {
                                    const value = typeof item.value === 'number' ? item.value : 0;
                                    return value > 0;
                                });

                                const date = new Date(Number(payload[0]?.payload?.date));

                                // If all values are zero, show "No activity" message
                                if (filteredPayload.length === 0) {
                                    return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="text-muted-foreground text-xs">
                                                {date.toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </div>
                                            <div className="text-muted-foreground mt-1 text-xs">No activity</div>
                                        </div>
                                    );
                                }

                                return (
                                    <ChartTooltipContent
                                        active={active}
                                        payload={filteredPayload}
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
                        {endpoints
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                            .filter(ep => ep && ep.name && typeof ep.name === "string")
                            .map((endpoint) => {
                                const endpointName = endpoint.name;
                                const sanitizedKey = getSanitizedKey(endpointName);
                                if (!sanitizedKey) return null;
                                return (
                                    <Area
                                        key={endpoint.id}
                                        dataKey={endpointName}
                                        type="natural"
                                        fill={`url(#fill-${endpoint.id})`}
                                        stroke={`var(--color-${sanitizedKey})`}
                                        stackId="a"
                                        baseValue={0}
                                    />
                                );
                            })}
                    </AreaChart>
                </ChartContainer>
            ) : null}
        </DashboardCard>
    );
}