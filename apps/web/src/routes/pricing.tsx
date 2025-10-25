import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { AlertCircle, Check } from "lucide-react";

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
        credentials: "include",
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      window.location.href = data.checkoutUrl;
    }
    catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to create checkout session");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          {session ? "Select a plan to get started" : "Sign in to subscribe"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Basic features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>5 jobs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>100 runs/month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Community support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button disabled className="w-full" variant="secondary">
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Tier */}
        <Card className="border-primary relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
            Popular
          </Badge>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">$29.99</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>All Free features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>50 jobs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Unlimited runs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>AI-powered scheduling</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => handleCheckout("pro")}
              disabled={!session || loading === "pro"}
              className="w-full"
            >
              {loading === "pro" ? "Loading..." : session ? "Subscribe to Pro" : "Sign in to subscribe"}
            </Button>
          </CardFooter>
        </Card>

        {/* Enterprise Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">$99.99</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>All Pro features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Unlimited jobs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Custom integrations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>Dedicated support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                <span>SLA guarantee</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => handleCheckout("enterprise")}
              disabled={!session || loading === "enterprise"}
              variant="outline"
              className="w-full"
            >
              {loading === "enterprise" ? "Loading..." : session ? "Subscribe to Enterprise" : "Sign in to subscribe"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {!session && (
        <p className="text-center text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
          {" "}
          or
          {" "}
          <a href="/register" className="text-primary hover:underline">
            create an account
          </a>
          {" "}
          to get started
        </p>
      )}

      <Alert>
        <AlertDescription>
          <p className="font-semibold mb-2">💳 Test Mode</p>
          <p>
            Use test card:
            {" "}
            <code className="bg-muted px-2 py-1 rounded">4242 4242 4242 4242</code>
          </p>
          <p>Any future expiry date and any 3-digit CVC</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
