import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cronicorn/ui-library/components/card';
import { Progress } from '@cronicorn/ui-library/components/progress';
import { PageHeader } from '../../components/page-header';
import { usageQueryOptions } from '../../lib/api-client/queries/subscriptions.queries';

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

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
              <CardDescription>{metric.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
