import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { PageHeader } from "../../components/page-header";
import { PageSection, DetailSection, StatCard, CodeBlock } from "@/components/sections";
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

      <PageSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle2}
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
                  {health.failureStreak} consecutive {health.failureStreak === 1 ? "failure" : "failures"}
                </Badge>
              )}
            </div>
          </StatCard>
        </div>

        <DetailSection 
          title="Health Summary Data" 
          description="Raw health metrics and statistics"
        >
          <CodeBlock code={JSON.stringify(health, null, 2)} language="json" />
        </DetailSection>
      </PageSection>
    </>
  );
}
