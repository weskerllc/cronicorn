"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@cronicorn/ui-library/components/toggle-group";
import type { ChartConfig } from "@cronicorn/ui-library/components/chart";
import { dashboardStatsQueryOptions } from "@/lib/api-client/queries/dashboard.queries";

import { useIsMobile } from "@/hooks/use-mobile";

const chartConfig = {
  success: {
    label: "Success",
    color: "hsl(var(--chart-2))",
  },
  failure: {
    label: "Failed",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("7d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  // Map timeRange to days for API
  const days = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 7;
  const { data, isLoading } = useQuery(dashboardStatsQueryOptions({ days }));

  if (isLoading || !data) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Run Activity</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full animate-pulse bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data.runTimeSeries.map((point) => ({
    date: point.date,
    success: point.success,
    failure: point.failure,
  }));

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Run Activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Showing run history for the last {days} days
          </span>
          <span className="@[540px]/card:hidden">Last {days} days</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 7 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillFailure" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
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
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="success"
              type="natural"
              fill="url(#fillSuccess)"
              stroke="var(--color-success)"
              stackId="a"
            />
            <Area
              dataKey="failure"
              type="natural"
              fill="url(#fillFailure)"
              stroke="var(--color-failure)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
