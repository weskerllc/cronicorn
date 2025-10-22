import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@cronicorn/ui-library/components/alert';
import { Badge } from '@cronicorn/ui-library/components/badge';
import { Button } from '@cronicorn/ui-library/components/button';
import { Card } from '@cronicorn/ui-library/components/card';
import { PageHeader } from '../../components/page-header';
import { subscriptionStatusQueryOptions } from '../../lib/api-client/queries/subscriptions.queries';

export const Route = createFileRoute('/_authed/plan')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(subscriptionStatusQueryOptions());
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: subscription } = useSuspenseQuery(subscriptionStatusQueryOptions());


  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      window.location.href = data.portalUrl;
    }
    catch (err) {
      console.error("Portal error:", err);
      setError(err instanceof Error ? err.message : "Failed to open customer portal");
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        text="Subscription Plan"
        description="Manage your subscription and billing"
      />

      <Card>
        <div className="space-y-4">
          <div>
            <span className="font-medium">Current Plan:</span>
            {" "}
            <Badge variant="secondary" className="capitalize">
              {subscription.tier}
            </Badge>
          </div>

          {subscription.tier !== "free" && (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            </>
          )}

          {subscription.tier === "free" && (
            <div className="pt-4">
              <Button asChild>
                <a href="/pricing">Upgrade Plan</a>
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

}
