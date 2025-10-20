import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
});

function Pricing() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (tier: "pro" | "enterprise") => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    }
    catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to create checkout session");
      setLoading(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h1>
      <p className="text-center text-gray-600 mb-12">
        {session ? "Select a plan to get started" : "Sign in to subscribe"}
      </p>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Tier */}
        <div className="border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-2">Free</h3>
          <div className="text-3xl font-bold mb-4">
            $0
            <span className="text-base font-normal text-gray-600">/month</span>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ Basic features</li>
            <li>✓ 5 jobs</li>
            <li>✓ 100 runs/month</li>
            <li>✓ Community support</li>
          </ul>
          <button
            disabled
            className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded cursor-not-allowed"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="border-2 border-blue-500 rounded-lg p-6 shadow-md relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
            Popular
          </div>
          <h3 className="text-xl font-bold mb-2">Pro</h3>
          <div className="text-3xl font-bold mb-4">
            $29.99
            <span className="text-base font-normal text-gray-600">/month</span>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ All Free features</li>
            <li>✓ 50 jobs</li>
            <li>✓ Unlimited runs</li>
            <li>✓ AI-powered scheduling</li>
            <li>✓ Priority support</li>
          </ul>
          <button
            onClick={() => handleCheckout("pro")}
            disabled={!session || loading === "pro"}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading === "pro" ? "Loading..." : session ? "Subscribe to Pro" : "Sign in to subscribe"}
          </button>
        </div>

        {/* Enterprise Tier */}
        <div className="border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-2">Enterprise</h3>
          <div className="text-3xl font-bold mb-4">
            $99.99
            <span className="text-base font-normal text-gray-600">/month</span>
          </div>
          <ul className="space-y-2 mb-6 text-gray-600">
            <li>✓ All Pro features</li>
            <li>✓ Unlimited jobs</li>
            <li>✓ Advanced analytics</li>
            <li>✓ Custom integrations</li>
            <li>✓ Dedicated support</li>
            <li>✓ SLA guarantee</li>
          </ul>
          <button
            onClick={() => handleCheckout("enterprise")}
            disabled={!session || loading === "enterprise"}
            className="w-full py-2 px-4 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading === "enterprise" ? "Loading..." : session ? "Subscribe to Enterprise" : "Sign in to subscribe"}
          </button>
        </div>
      </div>

      {!session && (
        <p className="text-center mt-8 text-gray-600">
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
          {" "}
          or
          {" "}
          <a href="/register" className="text-blue-600 hover:underline">
            create an account
          </a>
          {" "}
          to get started
        </p>
      )}

      <div className="mt-12 p-4 bg-gray-50 rounded text-sm text-gray-600">
        <p className="font-semibold mb-2">💳 Test Mode</p>
        <p>
          Use test card:
          {" "}
          <code className="bg-white px-2 py-1 rounded">4242 4242 4242 4242</code>
        </p>
        <p>Any future expiry date and any 3-digit CVC</p>
      </div>
    </div>
  );
}
