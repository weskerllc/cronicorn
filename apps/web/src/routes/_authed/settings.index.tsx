import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@cronicorn/ui-library/components/card";
import { PageHeader } from "@/components/page-header";
import { subscriptionStatusQueryOptions, usageQueryOptions } from "@/lib/api-client/queries/subscriptions.queries";
import { useSession } from "@/lib/auth-client.js";

export const Route = createFileRoute("/_authed/settings/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(subscriptionStatusQueryOptions()),
      context.queryClient.ensureQueryData(usageQueryOptions()),
    ]);
  },
  component: Settings,
});

function Settings() {
  const { data: session } = useSession();



  if (!session) {
    return (
      <div>
        <p>Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        text="Account Settings"
        description="Manage your profile and preferences"
      />

      <Card>
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Name:</span>
            {" "}
            {session.user.name}
          </p>
          <p>
            <span className="font-medium">Email:</span>
            {" "}
            {session.user.email}
          </p>
        </div>
      </Card>
    </div>
  );
}
