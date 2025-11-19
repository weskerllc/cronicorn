import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query';
import { Progress } from '@cronicorn/ui-library/components/progress';
import { GridLayout } from '../../components/primitives/grid-layout';
import { PageHeader } from '../../components/composed/page-header';
import { usageQueryOptions } from '../../lib/api-client/queries/subscriptions.queries';
import { PageSection } from '../../components/primitives/page-section';
import { StatCard } from '../../components/cards/stat-card';

export const Route = createFileRoute('/_authed/usage')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(usageQueryOptions())
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: usage } = useSuspenseQuery(usageQueryOptions());

  const metrics = [
    {
      title: "AI Usage",
      description: "Your token usage for the current period",
      used: usage.aiCallsUsed || 0,
      limit: usage.aiCallsLimit || 0,
    },
    {
      title: "Endpoints",
      description: "Number of endpoints across all jobs",
      used: usage.endpointsUsed || 0,
      limit: usage.endpointsLimit || 0,
    },
    {
      title: "Total Runs",
      description: "Total endpoint executions this period",
      used: usage.totalRuns || 0,
      limit: usage.totalRunsLimit || 0,
    },
  ];

  return (
    <>
      <PageHeader
        text="Quota Usage"
        description="View your current usage and limits"
      />

      <PageSection>
        <h2 className="text-lg font-semibold mb-4">Current Usage</h2>
        <GridLayout cols={1} md={3}>
          {metrics.map((metric) => (
            <StatCard
              key={metric.title}
              title={metric.title}
              description={metric.description}
              value={`${metric.used} / ${metric.limit || 'unlimited'}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {metric.used} / {metric.limit || 'unlimited'}
                  </span>
                </div>
                {metric.limit > 0 && (
                  <Progress
                    value={(metric.used / metric.limit) * 100}
                  />
                )}
              </div>
            </StatCard>
          ))}
        </GridLayout>
      </PageSection>
    </>
  );
}
