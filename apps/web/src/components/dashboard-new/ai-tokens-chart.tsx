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
import { getDateRangeEndLabel, getDateRangeStartLabel } from "@/lib/time-range-labels";

interface AITokensChartProps {
    data: Array<AISessionTimeSeriesPoint>;
    /** Pre-calculated chart config for consistent colors */
    chartConfig: ChartConfig;
    /** Start date for the displayed range */
    startDate?: Date;
    /** End date for the displayed range */
    endDate?: Date;
}

export function AITokensChart({
    data,
    chartConfig,
    startDate,
    endDate,
}: AITokensChartProps) {
    // Transform flat endpoint time-series into grouped-by-date format for Recharts
    const { chartData, endpoints, totalEndpoints } = useMemo(() => {
        // Calculate total tokens per endpoint to find top performers
        const endpointTotals = new Map<string, { id: string; name: string; total: number }>();
        data.forEach((item) => {
            const existing = endpointTotals.get(item.endpointId);
            if (existing) {
                existing.total += item.totalTokens;
            } else {
                endpointTotals.set(item.endpointId, { id: item.endpointId, name: item.endpointName, total: item.totalTokens });
            }
        });

        // Sort endpoints by total tokens DESC and take top 10 for display
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
                dateMap.set(item.date, {
                    date: new Date(item.date).getTime()
                });
            }
            const dateEntry = dateMap.get(item.date)!;
            // Use endpoint name as key for token count
            dateEntry[item.endpointName] = item.totalTokens;
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

    // Show chart even if all tokens are zero (to show the timeline structure)
    const hasData = data.length > 0;

    // Calculate total tokens
    const totalTokens = useMemo(() => {
        return data.reduce((sum, point) => sum + point.totalTokens, 0);
    }, [data]);

    // Calculate max value across all displayed endpoints (not stacked)
    // This ensures the Y-axis shows the true magnitude of each endpoint's activity
    const maxValue = useMemo(() => {
        if (chartData.length === 0) return 0;

        // Find the maximum single value across all data points and endpoints
        const max = chartData.reduce((maxVal, dataPoint) => {
            const pointMax = endpoints.reduce((pointMaxVal, endpoint) => {
                const value = dataPoint[endpoint.name];
                return Math.max(pointMaxVal, typeof value === 'number' ? value : 0);
            }, 0);
            return Math.max(maxVal, pointMax);
        }, 0);

        // Add 10% padding and round up to a nice whole number
        return Math.ceil(max * 1.1);
    }, [chartData, endpoints]);

    const description = hasData ? (
        <>
            <p>
                Tokens: <span className="text-foreground font-medium">{totalTokens.toLocaleString()}</span>
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
            title="AI Token Usage"
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
                                            id={`fill-tokens-${endpoint.id}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.4}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor={`var(--color-${sanitizedKey})`}
                                                stopOpacity={0.05}
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
                                    return getDateRangeStartLabel(startDate, endDate);
                                }
                                return getDateRangeEndLabel(startDate, endDate);
                            }}
                        />
                        <YAxis
                            domain={[0, maxValue || 'auto']}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={75}
                            allowDecimals={false}
                            tickFormatter={(value) => Math.round(value).toLocaleString()}
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
                                        fill={`url(#fill-tokens-${endpoint.id})`}
                                        stroke={`var(--color-${sanitizedKey})`}
                                        strokeWidth={2}
                                        fillOpacity={0.6}
                                    />
                                );
                            })}
                    </AreaChart>
                </ChartContainer>
            ) : null}

        </DashboardCard>
    );
}
