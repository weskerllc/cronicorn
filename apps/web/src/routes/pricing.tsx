import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { AlertCircle, Check, Star, CreditCard } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { SEO, createBreadcrumbStructuredData } from "@/components/SEO";
import siteConfig from "@/site-config";

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

  // Rich structured data for pricing page with product offers
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Pricing", url: "/pricing" }
      ]),
      {
        "@type": "WebPage",
        "name": "Cronicorn Pricing Plans",
        "description": "Choose the perfect plan for your job scheduling needs. From free to enterprise, get AI-powered automation that scales with your business.",
        "url": `${siteConfig.siteUrl}/pricing`
      },
      {
        "@type": "Product",
        "name": siteConfig.siteName,
        "description": siteConfig.description,
        "brand": {
          "@type": "Brand",
          "name": siteConfig.company
        },
        "offers": siteConfig.pricingTiers.map(tier => ({
          "@type": "Offer",
          "name": `${siteConfig.siteName} ${tier.name}`,
          "description": `${tier.name} plan for ${siteConfig.siteName} - ${tier.features.join(", ")}`,
          "price": tier.price,
          "priceCurrency": tier.currency,
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock",
          "url": `${siteConfig.siteUrl}/pricing`,
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": tier.price,
            "priceCurrency": tier.currency,
            "billingDuration": "P1M",
            "referenceQuantity": {
              "@type": "QuantitativeValue",
              "value": 1,
              "unitCode": "MON"
            }
          },
          "seller": {
            "@type": "Organization",
            "name": siteConfig.company,
            "url": siteConfig.siteUrl
          }
        }))
      }
    ]
  };

  return (
    <>
      <SEO
        title="Pricing Plans"
        description="Choose the perfect Cronicorn plan for your team. From free tier to enterprise solutions, get AI-powered job scheduling that scales with your needs. Transparent pricing with no hidden fees."
        keywords={[
          "cronicorn pricing",
          "job scheduling pricing",
          "cron job management cost",
          "automation platform pricing",
          "AI scheduling plans",
          "subscription plans",
          "enterprise job scheduling"
        ]}
        canonical="/pricing"
        structuredData={structuredData}
      />

      <div className="max-w-7xl mx-auto space-y-12 p-8">
        {/* Header Section */}
        <header className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Choose Your Perfect Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {session
                ? "Select a plan to unlock the full power of AI-driven job scheduling"
                : "Sign in to subscribe and start optimizing your scheduled tasks today"
              }
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>30-day money back</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <section className="grid lg:grid-cols-3 gap-8" role="table" aria-label="Pricing plans comparison">
          {/* Free Tier */}
          <Card className="relative" role="gridcell">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="space-y-2">
                <div className="text-4xl font-bold">$0</div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <CardDescription className="text-base">
                Perfect for getting started with basic job scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3" role="list">
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>5 scheduled jobs</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>100 executions per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Basic scheduling features</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Community support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Basic analytics dashboard</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full" variant="secondary" size="lg">
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className="border-primary relative shadow-lg scale-105" role="gridcell">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600">
              ⭐ Most Popular
            </Badge>
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl">Pro</CardTitle>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  $29<span className="text-lg font-normal">.99</span>
                </div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <CardDescription className="text-base">
                Ideal for growing teams and serious automation needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3" role="list">
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span><strong>50 scheduled jobs</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span><strong>Unlimited executions</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span><strong>AI-powered scheduling optimization</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Advanced analytics & insights</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Priority email support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Webhook integrations</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleCheckout("pro")}
                disabled={!session || loading === "pro"}
                className="w-full"
                size="lg"
              >
                {loading === "pro" ? "Loading..." : session ? "Subscribe to Pro" : "Sign in to subscribe"}
              </Button>
            </CardFooter>
          </Card>

          {/* Enterprise Tier */}
          <Card role="gridcell">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Enterprise</CardTitle>
              <div className="space-y-2">
                <div className="text-4xl font-bold">
                  $99<span className="text-lg font-normal">.99</span>
                </div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <CardDescription className="text-base">
                Complete solution for large organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3" role="list">
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span><strong>Unlimited scheduled jobs</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Advanced AI optimization & predictions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Custom integrations & API access</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Dedicated customer success manager</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>99.9% uptime SLA guarantee</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span>Priority phone & chat support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleCheckout("enterprise")}
                disabled={!session || loading === "enterprise"}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {loading === "enterprise" ? "Loading..." : session ? "Subscribe to Enterprise" : "Sign in to subscribe"}
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Call-to-Action for Non-Authenticated Users */}
        {!session && (
          <section className="text-center space-y-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold">Ready to get started?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              <a href="/register" className="text-primary hover:underline font-medium">
                Create your free account
              </a>
              {" "}or{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                sign in
              </a>
              {" "}to choose your plan and start optimizing your job scheduling today.
            </p>
          </section>
        )}

        {/* Test Mode Notice */}
        <Alert className="max-w-2xl mx-auto">
          <CreditCard className="size-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">💳 Test Mode - Safe to Try</p>
            <p className="mb-2">
              Use test card: <code className="bg-muted px-2 py-1 rounded font-mono">4242 4242 4242 4242</code>
            </p>
            <p>Any future expiry date and any 3-digit CVC. No real charges will be made.</p>
          </AlertDescription>
        </Alert>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Can I change plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                Our free plan gives you full access to core features. Upgrade anytime for advanced capabilities.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards and PayPal through our secure Stripe integration.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                Yes, we offer a 30-day money-back guarantee on all paid plans. No questions asked.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
