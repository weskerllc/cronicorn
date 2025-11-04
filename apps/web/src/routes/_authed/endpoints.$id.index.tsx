import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Edit, 
  ExternalLink, 
  Pause, 
  Play, 
  TrendingUp,
  Zap
} from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { toast } from "sonner";

import { PageHeader } from "../../components/page-header";
import { DataTable } from "../../components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { 
  endpointByIdQueryOptions, 
  pauseEndpoint, 
  resetFailures, 
  scheduleOneShot 
} from "@/lib/api-client/queries/endpoints.queries";
import { healthQueryOptions, runsQueryOptions } from "@/lib/api-client/queries/runs.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/endpoints/$id/")({
  loader: async ({ params, context }) => {
    // Load endpoint by ID
    const endpoint = await context.queryClient.ensureQueryData(
      endpointByIdQueryOptions(params.id),
    );
    // Load health and recent runs
    await Promise.all([
      context.queryClient.ensureQueryData(healthQueryOptions(params.id)),
      context.queryClient.ensureQueryData(runsQueryOptions(params.id, { limit: 10 })),
    ]);
    // Load job for breadcrumb context (if jobId exists)
    if (endpoint.jobId) {
      await context.queryClient.ensureQueryData(jobQueryOptions(endpoint.jobId));
    }
  },
  component: ViewEndpointPage,
});

type RunRow = {
  runId: string;
  status: "success" | "failure" | "timeout" | "cancelled";
  durationMs?: number;
  startedAt: Date;
};

function ViewEndpointPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: endpoint } = useSuspenseQuery(endpointByIdQueryOptions(id));
  const { data: health } = useSuspenseQuery(healthQueryOptions(id));
  const { data: runsData } = useSuspenseQuery(runsQueryOptions(id, { limit: 10 }));

  const { mutateAsync: pauseMutate, isPending: pausePending } = useMutation({
    mutationFn: async (pausedUntil: string | null) => pauseEndpoint(id, { pausedUntil }),
    onSuccess: async (_, pausedUntil) => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
      if (endpoint.jobId) {
        await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
      }
      toast.success(pausedUntil ? "Endpoint paused for 24 hours" : "Endpoint resumed");
    },
  });

  const { mutateAsync: resetMutate, isPending: resetPending } = useMutation({
    mutationFn: async () => resetFailures(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
      if (endpoint.jobId) {
        await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
      }
      toast.success("Failure count reset");
    },
  });

  const { mutateAsync: runNowMutate, isPending: runNowPending } = useMutation({
    mutationFn: async () => scheduleOneShot(id, { nextRunInMs: 0, reason: "Manual trigger via UI" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
      if (endpoint.jobId) {
        await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
      }
      toast.success("Endpoint scheduled to run immediately");
    },
  });

  const handlePause = async () => {
    const isPaused = endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date();
    const pausedUntil = isPaused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await pauseMutate(pausedUntil);
  };

  const handleResetFailures = async () => {
    await resetMutate();
  };

  const handleRunNow = async () => {
    await runNowMutate();
  };

  const isPaused = !!(endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date());
  const hasAIHints = !!(endpoint.aiHintIntervalMs || endpoint.aiHintNextRunAt || endpoint.aiHintReason);
  const isHintExpired = endpoint.aiHintExpiresAt && new Date(endpoint.aiHintExpiresAt) < new Date();

  const totalRuns = health.successCount + health.failureCount;
  const successRate = totalRuns > 0
    ? ((health.successCount / totalRuns) * 100).toFixed(1)
    : null;

  const columns: Array<ColumnDef<RunRow>> = [
    {
      accessorKey: "runId",
      header: "Run ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono">{row.original.runId.substring(0, 8)}</code>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === "success"
            ? "default"
            : status === "failure"
              ? "destructive"
              : "secondary";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "durationMs",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.durationMs ? `${row.original.durationMs}ms` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "startedAt",
      header: "Started At",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.startedAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="link" size="sm" asChild>
          <Link to="/runs/$id" params={{ id: row.original.runId }}>
            View Details
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          text={endpoint.name}
          description={endpoint.description || "Endpoint details and execution history"}
        />
        <div className="flex gap-2">
          <Button variant="default" asChild>
            <Link to="/endpoints/$id/edit" params={{ id }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Endpoint
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Alerts */}
      {isPaused && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
              <Pause className="h-5 w-5" />
              <span className="font-semibold">This endpoint is currently paused</span>
              {endpoint.pausedUntil && (
                <span className="text-sm">
                  until {new Date(endpoint.pausedUntil).toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {hasAIHints && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Scheduling Hint Active</h3>
              {isHintExpired && (
                <Badge variant="destructive">Expired</Badge>
              )}
            </div>

            <div className="space-y-2">
              {endpoint.aiHintIntervalMs && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suggested Interval:</span>
                  <span className="font-medium">
                    {Math.round(endpoint.aiHintIntervalMs / 60000)} minutes
                  </span>
                </div>
              )}
              {endpoint.aiHintNextRunAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suggested Next Run:</span>
                  <span className="font-medium">
                    {new Date(endpoint.aiHintNextRunAt).toLocaleString()}
                  </span>
                </div>
              )}
              {endpoint.aiHintReason && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Reason: </span>
                  <span className="italic">{endpoint.aiHintReason}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
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
                {health.failureStreak} consecutive
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Endpoint settings and schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">URL:</span>
              <a 
                href={endpoint.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline flex items-center gap-1 max-w-xs truncate"
              >
                {endpoint.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method:</span>
              <Badge variant="outline">{endpoint.method}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Schedule Type:</span>
              <span className="font-medium">
                {endpoint.baselineCron ? "Cron" : "Interval"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Schedule:</span>
              <span className="font-mono text-xs">
                {endpoint.baselineCron || 
                  (endpoint.baselineIntervalMs ? 
                    `Every ${Math.round(endpoint.baselineIntervalMs / 60000)}min` : 
                    "Not configured")}
              </span>
            </div>
            {endpoint.minIntervalMs && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Interval:</span>
                <span className="font-mono text-xs">
                  {Math.round(endpoint.minIntervalMs / 60000)}min
                </span>
              </div>
            )}
            {endpoint.maxIntervalMs && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Interval:</span>
                <span className="font-mono text-xs">
                  {Math.round(endpoint.maxIntervalMs / 60000)}min
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution State</CardTitle>
            <CardDescription>Current scheduling and run status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isPaused ? "secondary" : "default"}>
                {isPaused ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Paused
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </>
                )}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Run:</span>
              <span className="font-mono text-xs">
                {endpoint.lastRunAt 
                  ? new Date(endpoint.lastRunAt).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next Run:</span>
              <span className="font-mono text-xs">
                {new Date(endpoint.nextRunAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Failure Count:</span>
              <Badge variant={endpoint.failureCount > 0 ? "destructive" : "outline"}>
                {endpoint.failureCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button
          variant="default"
          onClick={handleRunNow}
          disabled={runNowPending || isPaused}
        >
          <Play className="h-4 w-4 mr-2" />
          {runNowPending ? "Scheduling..." : "Run Now"}
        </Button>
        <Button
          variant="secondary"
          onClick={handlePause}
          disabled={pausePending}
        >
          {pausePending ? "Loading..." : isPaused ? "Resume Endpoint" : "Pause Endpoint"}
        </Button>
        <Button
          variant="outline"
          onClick={handleResetFailures}
          disabled={resetPending}
        >
          {resetPending ? "Loading..." : "Reset Failure Count"}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/endpoints/$id/health" params={{ id }}>
            View Full Health Report
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/endpoints/$id/runs" params={{ id }}>
            View All Runs
          </Link>
        </Button>
      </div>

      <Separator className="my-8" />

      {/* Recent Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>Last 10 execution attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={runsData.runs.map(run => ({
              ...run,
              status: run.status as "success" | "failure" | "timeout" | "cancelled",
              startedAt: new Date(run.startedAt),
            }))}
            emptyMessage="No runs found for this endpoint."
          />
          {runsData.runs.length >= 10 && (
            <div className="mt-4 text-center">
              <Button variant="link" asChild>
                <Link to="/endpoints/$id/runs" params={{ id }}>
                  View All Runs →
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
