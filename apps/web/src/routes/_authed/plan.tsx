import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@cronicorn/ui-library/components/alert';
import { Badge } from '@cronicorn/ui-library/components/badge';
import { Button } from '@cronicorn/ui-library/components/button';
import { PageHeader } from '../../components/composed/page-header';
import { createPortalSession, subscriptionStatusQueryOptions } from '../../lib/api-client/queries/subscriptions.queries';
import { DetailSection } from '../../components/cards/detail-section';
import { PageSection } from '@/components/primitives/page-section';

export const Route = createFileRoute('/_authed/plan')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(subscriptionStatusQueryOptions());
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: subscription } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: (err) => {
      console.error("Portal error:", err);
    },
  });

  const portalErrorMessage = portalMutation.error instanceof Error
    ? portalMutation.error.message
    : portalMutation.error
      ? "Failed to open customer portal"
      : null;

  const handleManageSubscription = async () => {
    await portalMutation.mutateAsync();
  };

  return (
    <>
      <PageHeader
        text="Subscription Plan"
        description="Manage your subscription and billing"
      />

      <PageSection>
        <DetailSection
          title="Current Plan"
          description={
            <>
              You are currently on the <Badge variant="secondary" className="capitalize">{subscription.tier}</Badge> plan
            </>
          }
        >
          {subscription.tier !== "free" && (
            <>
              {portalErrorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{portalErrorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleManageSubscription}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? "Loading..." : "Manage Subscription"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            </>
          )}

          {subscription.tier === "free" && (
            <div className="space-y-2">
              <Button asChild>
                <Link to="/pricing">Upgrade Plan</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Unlock more features with a paid plan
              </p>
            </div>
          )}
        </DetailSection>
      </PageSection>
    </>
  );
}
