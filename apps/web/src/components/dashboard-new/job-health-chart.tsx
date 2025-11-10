"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";

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
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";

import type { JobHealthItem } from "@cronicorn/api-contracts/dashboard";

const chartConfig = {
    successCount: {
        label: "Success",
        color: "var(--chart-2)",
    },
    failureCount: {
        label: "Failed",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig;

interface JobHealthChartProps {
    data: Array<JobHealthItem>;
    onJobClick?: (jobId: string) => void;
    selectedJobId?: string;
}

export function JobHealthChart({
    data,
    onJobClick,
    selectedJobId,
}: JobHealthChartProps) {
    // const [selectedJobId, setSelectedJobId] = useState<string>("all");

    // const filteredData = useMemo(() => {
    //     if (selectedJobId === "all") return data;
    //     return data.filter(item => item.jobId === selectedJobId);
    // }, [data, selectedJobId]);

    const activeIndex = useMemo(
        () => data.findIndex((item) => item.jobId === selectedJobId),
        [data, selectedJobId]
    );

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Job Health Overview</CardTitle>
                    <CardDescription>No job data available</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
                    <p>No runs found to display job health</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex-row items-start space-y-0 pb-0">
                <div className="grid flex-1 gap-1 space-y-2 text-sm">
                    <CardTitle>Runs Per Job</CardTitle>
                    <CardDescription>
                        <p>Active Jobs</p>
                        <p className="text-foreground font-medium">{data.length}</p>
                    </CardDescription>
                </div>
                <Select value={selectedJobId} onValueChange={(id) => onJobClick?.(id)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {data.map((job) => (
                            <SelectItem key={job.jobId} value={job.jobId}>
                                {job.jobName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={data}
                        layout="vertical"
                    >
                        <CartesianGrid horizontal={false} />
                        <XAxis hide type="number" />
                        <YAxis
                            dataKey="jobName"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 20)}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar
                            dataKey="successCount"
                            stackId="a"
                            fill="var(--color-successCount)"
                            radius={[4, 0, 0, 4]}
                            onClick={(data) => onJobClick?.(data.jobId)}
                            style={{ cursor: "pointer" }}
                            activeIndex={activeIndex}
                            activeBar={(props: any) => {
                                return (
                                    <Rectangle
                                        {...props}
                                        fill={props.fill}
                                        fillOpacity={0.8}
                                        stroke="var(--chart-2)"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                    />
                                )
                            }}
                        />
                        <Bar
                            dataKey="failureCount"
                            stackId="a"
                            fill="var(--color-failureCount)"
                            radius={[0, 4, 4, 0]}
                            onClick={(data) => onJobClick?.(data.jobName)}
                            style={{ cursor: "pointer" }}

                            activeIndex={activeIndex}
                            activeBar={(props: any) => {
                                return (
                                    <Rectangle
                                        {...props}
                                        fill={props.fill}
                                        fillOpacity={0.8}
                                        stroke="var(--chart-1)"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                    />
                                )
                            }}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
