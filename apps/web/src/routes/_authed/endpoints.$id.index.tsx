import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  Pause,
  Play,
  TrendingUp,
  Zap
} from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { toast } from "sonner";
import { ActionsGroup } from "../../components/primitives/actions-group";
import { GridLayout } from "../../components/primitives/grid-layout";
import { AlertCard } from "../../components/cards/alert-card";
import { StatCard } from "../../components/cards/stat-card";
import { PageSection } from "../../components/primitives/page-section";
import { DetailSection } from "../../components/cards/detail-section";
import { InfoField, InfoGrid } from "../../components/cards/info-grid";
import { RelativeTime } from "../../components/composed/relative-time";
import { isEndpointPaused } from "@/lib/endpoint-utils";
import {
  archiveEndpoint,
  pauseEndpoint,
  resetFailures,
  scheduleOneShot
} from "@/lib/api-client/queries/endpoints.queries";
import { healthQueryOptions } from "@/lib/api-client/queries/runs.queries";

export const Route = createFileRoute("/_authed/endpoints/$id/")({
  component: ViewEndpointPage,
});

function ViewEndpointPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  // Access parent route's loader data
  const parentRouteApi = getRouteApi("/_authed/endpoints/$id");
  const { endpoint } = parentRouteApi.useLoaderData();
  const { data: health } = useSuspenseQuery(healthQueryOptions(id));

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

  const { mutateAsync: archiveMutate, isPending: archivePending } = useMutation({
    mutationFn: async () => {
      if (!endpoint.jobId) throw new Error("Job ID not found");
      return archiveEndpoint(endpoint.jobId, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
      if (endpoint.jobId) {
        await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
      }
      toast.success("Endpoint archived successfully");
    },
  });

  const handlePause = async () => {
    const isPaused = isEndpointPaused(endpoint.pausedUntil); const pausedUntil = isPaused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await pauseMutate(pausedUntil);
  };

  const handleResetFailures = async () => {
    await resetMutate();
  };

  const handleRunNow = async () => {
    await runNowMutate();
  };

  const handleArchive = async () => {
    if (confirm(`Archive "${endpoint.name}"? It will no longer count toward quota or be scheduled.`)) {
      await archiveMutate();
    }
  };

  const isPaused = isEndpointPaused(endpoint.pausedUntil);
  const hasAIHints = !!(endpoint.aiHintIntervalMs || endpoint.aiHintNextRunAt || endpoint.aiHintReason);
  const isHintExpired = endpoint.aiHintExpiresAt && new Date(endpoint.aiHintExpiresAt) < new Date();

  const totalRuns = health.successCount + health.failureCount;
  const successRate = totalRuns > 0
    ? ((health.successCount / totalRuns) * 100).toFixed(1)
    : null;

  return (
    <>
      {/* Status Alerts */}
      {endpoint.archivedAt && (
        <AlertCard variant="destructive" className="mb-6">
          <div className="flex items-center gap-2 text-destructive">
            <Archive className="h-5 w-5" />
            <span className="font-semibold">This endpoint is archived</span>
            <span className="text-sm">
              on <RelativeTime date={endpoint.archivedAt} showTooltip={false} />
            </span>
          </div>
        </AlertCard>
      )}

      {!endpoint.archivedAt && isPaused && (
        <AlertCard variant="warning" className="mb-6">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
            <Pause className="h-5 w-5" />
            <span className="font-semibold">This endpoint is currently paused</span>
            {endpoint.pausedUntil && (
              <span className="text-sm">
                until <RelativeTime date={endpoint.pausedUntil} showTooltip={false} />
              </span>
            )}
          </div>
        </AlertCard>
      )}

      {hasAIHints && (
        <AlertCard variant="info" className="mb-6">
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
                  <RelativeTime date={endpoint.aiHintNextRunAt} showTooltip={false} />
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
        </AlertCard>
      )}

      <PageSection>
        {/* Health Metrics Cards */}
        <GridLayout cols={1} md={2} lg={4}>
          <StatCard
            icon={TrendingUp}
            title="Success Rate"
            value={successRate ? `${successRate}%` : "N/A"}
            variant={successRate && Number.parseFloat(successRate) >= 90 ? "success" : "danger"}
          >
            {successRate && (
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {successRate}%
                </p>
                <Badge
                  variant={Number.parseFloat(successRate) >= 90 ? "default" : "destructive"}
                >
                  {Number.parseFloat(successRate) >= 90 ? "Healthy" : "Needs Attention"}
                </Badge>
              </div>
            )}
          </StatCard>

          <StatCard
            icon={Activity}
            title="Total Runs"
            value={totalRuns}
            subtext={`${health.successCount} success / ${health.failureCount} failed`}
          />

          <StatCard
            icon={Clock}
            title="Avg Duration"
            value={health.avgDurationMs ? `${health.avgDurationMs.toFixed(0)}ms` : "N/A"}
          />

          <StatCard
            icon={AlertCircle}
            title="Failures"
            value={health.failureCount || 0}
            variant={health.failureCount > 0 ? "danger" : "default"}
          >
            <div className="space-y-1">
              <p className="text-2xl font-bold text-destructive">
                {health.failureCount || 0}
              </p>
              {health.failureStreak > 0 && (
                <Badge variant="destructive">
                  {health.failureStreak} consecutive
                </Badge>
              )}
            </div>
          </StatCard>
        </GridLayout>

        {/* Endpoint Details */}
        <GridLayout cols={1} lg={2}>
          <DetailSection
            title="Configuration"
            description="Endpoint settings and schedule"
          >
            <InfoGrid columns={1}>
              <InfoField
                label="URL"
                value={
                  <a
                    href={endpoint.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs hover:underline flex items-center gap-1"
                  >
                    {endpoint.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
              <InfoField
                label="Method"
                value={<Badge variant="outline">{endpoint.method}</Badge>}
              />
              <InfoField
                label="Schedule Type"
                value={endpoint.baselineCron ? "Cron" : "Interval"}
              />
              <InfoField
                label="Schedule"
                value={
                  <code className="text-xs">
                    {endpoint.baselineCron ||
                      (endpoint.baselineIntervalMs ?
                        `Every ${Math.round(endpoint.baselineIntervalMs / 60000)}min` :
                        "Not configured")}
                  </code>
                }
              />
              {endpoint.minIntervalMs && (
                <InfoField
                  label="Min Interval"
                  value={<code className="text-xs">{Math.round(endpoint.minIntervalMs / 60000)}min</code>}
                />
              )}
              {endpoint.maxIntervalMs && (
                <InfoField
                  label="Max Interval"
                  value={<code className="text-xs">{Math.round(endpoint.maxIntervalMs / 60000)}min</code>}
                />
              )}
            </InfoGrid>
          </DetailSection>

          <DetailSection
            title="Execution State"
            description="Current scheduling and run status"
          >
            <InfoGrid columns={1}>
              <InfoField
                label="Status"
                value={
                  <Badge variant={endpoint.archivedAt ? "destructive" : isPaused ? "secondary" : "default"}>
                    {endpoint.archivedAt ? (
                      <>
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </>
                    ) : isPaused ? (
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
                }
              />
              <InfoField
                label="Last Run"
                value={
                  endpoint.lastRunAt
                    ? <RelativeTime date={endpoint.lastRunAt} liveUpdate />
                    : "Never"
                }
              />
              <InfoField
                label="Next Run"
                value={<RelativeTime date={endpoint.nextRunAt} liveUpdate />}
              />
              <InfoField
                label="Failure Count"
                value={
                  <Badge variant={endpoint.failureCount > 0 ? "destructive" : "outline"}>
                    {endpoint.failureCount}
                  </Badge>
                }
              />
            </InfoGrid>
          </DetailSection>

          <DetailSection
            title="Advanced Configuration"
            description="Timeout and execution limits"
          >
            <InfoGrid columns={1}>
              <InfoField
                label="Request Timeout"
                value={<code className="text-xs">{endpoint.timeoutMs ? `${endpoint.timeoutMs}ms` : "Default"}</code>}
              />
              <InfoField
                label="Max Execution Time"
                value={<code className="text-xs">{endpoint.maxExecutionTimeMs ? `${endpoint.maxExecutionTimeMs}ms` : "Default (60s)"}</code>}
              />
              <InfoField
                label="Max Response Size"
                value={<code className="text-xs">{endpoint.maxResponseSizeKb ? `${endpoint.maxResponseSizeKb}KB` : "Unlimited"}</code>}
              />
            </InfoGrid>
          </DetailSection>
        </GridLayout>

        {/* Action Buttons */}
        <ActionsGroup wrap gap="2" className="mb-8">
          <Button
            variant="default"
            onClick={handleRunNow}
            disabled={runNowPending || isPaused || !!endpoint.archivedAt}
          >
            <Play className="h-4 w-4 mr-2" />
            {runNowPending ? "Scheduling..." : "Run Now"}
          </Button>
          <Button
            variant="secondary"
            onClick={handlePause}
            disabled={pausePending || !!endpoint.archivedAt}
          >
            {pausePending ? "Loading..." : isPaused ? "Resume Endpoint" : "Pause Endpoint"}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetFailures}
            disabled={resetPending || !!endpoint.archivedAt}
          >
            {resetPending ? "Loading..." : "Reset Failure Count"}
          </Button>
          {!endpoint.archivedAt && (
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archivePending}
            >
              <Archive className="h-4 w-4 mr-2" />
              {archivePending ? "Archiving..." : "Archive Endpoint"}
            </Button>
          )}

        </ActionsGroup>
      </PageSection>
    </>
  );
}
