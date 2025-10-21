import { createFileRoute } from "@tanstack/react-router";

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
      <div className="p-8 max-w-4xl mx-auto">
        <p>Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Profile Section */}
      <div className="mb-8 p-6 border rounded-lg">
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
      </div>

    </div>
  );
}
