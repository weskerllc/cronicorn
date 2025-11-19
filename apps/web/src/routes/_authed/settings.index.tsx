import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PageSection, DetailSection, InfoGrid, InfoField } from "@/components/sections";
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

      <PageSection>
        <DetailSection 
          title="Profile" 
          description="Your account information"
        >
          <InfoGrid columns={1}>
            <InfoField label="Name" value={session.user.name} />
            <InfoField label="Email" value={session.user.email} />
          </InfoGrid>
        </DetailSection>
      </PageSection>
    </>
  );
}
