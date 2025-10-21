import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query';
import { usageQueryOptions } from '../../lib/api-client/queries/subscriptions.queries';

export const Route = createFileRoute('/_authed/usage')({
      loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(usageQueryOptions())
      },
  component: RouteComponent,
})

function RouteComponent() {
      const { data: usage } = useSuspenseQuery(usageQueryOptions());

  return      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quota Usage</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(usage, null, 2)}
        </pre>
      </div>

}
