import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@cronicorn/ui-library/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";
import { dashboardStatsQueryOptions } from "../../lib/api-client/queries/dashboard.queries";

export function SectionCards() {
  const { data, isLoading, error } = useQuery(dashboardStatsQueryOptions({ days: 7 }));

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-32"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 lg:px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load dashboard stats
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <IconTrendingUp className="size-4" />;
    if (trend === "down") return <IconTrendingDown className="size-4" />;
    return null;
  };

  const getTrendBadge = (trend: "up" | "down" | "stable", value?: string) => {
    const variant = trend === "up" ? "default" : trend === "down" ? "destructive" : "outline";
    return (
      <Badge variant={variant}>
        {getTrendIcon(trend)}
        {value || trend}
      </Badge>
    );
  };

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Jobs Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Jobs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.jobs.total}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active scheduled jobs
          </div>
          <div className="text-muted-foreground">
            Jobs containing {data.endpoints.total} endpoints
          </div>
        </CardFooter>
      </Card>

      {/* Active Endpoints Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Endpoints</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.endpoints.active}
          </CardTitle>
          <CardAction>
            {data.endpoints.paused > 0 && (
              <Badge variant="outline">
                {data.endpoints.paused} paused
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.endpoints.total} total endpoints
          </div>
          <div className="text-muted-foreground">
            {(data.endpoints.total ? (data.endpoints.active / data.endpoints.total) * 100 : 0).toFixed(0)}% actively running
          </div>
        </CardFooter>
      </Card>

      {/* Success Rate Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Success Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.successRate.overall.toFixed(1)}%
          </CardTitle>
          <CardAction>
            {getTrendBadge(data.successRate.trend)}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.successRate.trend === "up" && "Improving performance"}
            {data.successRate.trend === "down" && "Declining performance"}
            {data.successRate.trend === "stable" && "Stable performance"}
            {getTrendIcon(data.successRate.trend)}
          </div>
          <div className="text-muted-foreground">
            Compared to previous period
          </div>
        </CardFooter>
      </Card>

      {/* 24h Activity Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Last 24 Hours</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.recentActivity.runs24h}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {data.recentActivity.success24h} success
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.recentActivity.success24h} successful runs
          </div>
          <div className="text-muted-foreground">
            {data.recentActivity.failure24h} failures in last 24h
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
