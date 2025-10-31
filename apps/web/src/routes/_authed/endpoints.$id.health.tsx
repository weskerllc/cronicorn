import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";

import { PageHeader } from "../../components/page-header";
import { healthQueryOptions } from "@/lib/api-client/queries/runs.queries";

export const Route = createFileRoute("/_authed/endpoints/$id/health")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(healthQueryOptions(params.id));
  },
  component: EndpointHealthPage,
});

function EndpointHealthPage() {
  const { id } = Route.useParams();
  const { data: health } = useSuspenseQuery(healthQueryOptions(id));

  const totalRuns = health.successCount + health.failureCount;
  const successRate = totalRuns > 0
    ? ((health.successCount / totalRuns) * 100).toFixed(1)
    : null;

  return (
    <>
      <PageHeader
        text="Endpoint Health"
        description="View health metrics and performance statistics for this endpoint"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {successRate ? `${successRate}%` : "N/A"}
            </div>
            {successRate && (
              <Badge
                variant={Number.parseFloat(successRate) >= 90 ? "default" : "destructive"}
                className="mt-2"
              >
                {Number.parseFloat(successRate) >= 90 ? "Healthy" : "Needs Attention"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRuns}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {health.successCount} success / {health.failureCount} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failures</CardTitle>
            <AlertCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {health.failureCount || 0}
            </div>
            {health.failureStreak > 0 && (
              <Badge variant="destructive" className="mt-2">
                {health.failureStreak} consecutive {health.failureStreak === 1 ? "failure" : "failures"}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Summary Data</CardTitle>
          <CardDescription>Raw health metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
