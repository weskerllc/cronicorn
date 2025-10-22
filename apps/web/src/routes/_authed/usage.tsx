import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query';
import { Card } from '@cronicorn/ui-library/components/card';
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

  return (
    <div className="space-y-6">
      <PageHeader
        text="Quota Usage"
        description="View your current usage and limits"
      />

      <Card>
        <pre className="text-sm overflow-x-auto">
          {JSON.stringify(usage, null, 2)}
        </pre>
      </Card>
    </div>
  );

}
