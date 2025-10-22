import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
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
    <>
      <PageHeader
        text="Account Settings"
        description="Manage your profile and preferences"
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="text-sm">{session.user.name}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{session.user.email}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
