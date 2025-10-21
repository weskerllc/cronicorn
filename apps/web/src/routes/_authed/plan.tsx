import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
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

  return       <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>

        <div className="space-y-4">
          <div>
            <span className="font-medium">Current Plan:</span>
            {" "}
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize">
              {subscription.tier}
            </span>
          </div>

          {subscription.tier !== "free" && (
            <>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            </>
          )}

          {subscription.tier === "free" && (
            <div className="pt-4">
              <a
                href="/pricing"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Upgrade Plan
              </a>
            </div>
          )}
        </div>
      </div>

}
