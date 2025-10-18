import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { useSession } from "../../lib/auth-client";
import { subscriptionStatusQueryOptions, usageQueryOptions } from "../../lib/api-client/queries/subscriptions.queries";

export const Route = createFileRoute("/settings/")({
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
  const { data: subscription } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const { data: usage } = useSuspenseQuery(usageQueryOptions());
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      {/* Subscription Section */}
      <div className="mb-8 p-6 border rounded-lg">
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

      {/* Quota Usage */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quota Usage</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(usage, null, 2)}
        </pre>
      </div>

      {/* API Keys Section */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        <p className="text-gray-600 mb-4">
          Manage your API keys for programmatic access to Cronicorn.
        </p>
        <a
          href="/settings/api-keys"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Manage API Keys
        </a>
      </div>
    </div>
  );
}
