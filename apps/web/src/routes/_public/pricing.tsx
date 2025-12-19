import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { AlertCircle, Check, Shield, Star } from "lucide-react";

import { business, metaDescriptions, pageTitles, pricing, pricingFAQs } from "@cronicorn/content";
import { useSession } from "@/lib/auth-client";
import { createFAQSchema, createProductSchema, createSEOHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/pricing")({
  head: () => {
    // Structured data combining product tiers and FAQs
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        ...pricing.map((tier) => createProductSchema(tier)),
        createFAQSchema(pricingFAQs)
      ]
    };

    return createSEOHead({
      title: pageTitles.pricing,
      description: metaDescriptions.pricing,
      url: "/pricing",
      structuredData,
    });
  },
  component: Pricing,
});

function Pricing() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

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

  const faqs = pricingFAQs;

  return (
    <>
      <main className="max-w-5xl mx-auto space-y-16 px-6 py-12" role="main">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="space-y-3">
            <Badge variant="default" className="mx-auto bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
              🎉 Early Adopter: 35% off Premium forever
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Pricing made simple
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when ready. Transparent plans built for fast teams.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Shield className="w-4 h-4" aria-hidden="true" />
              14-day money-back guarantee
            </div>
            <p className="text-sm text-muted-foreground">Annual billing saves 20% instantly.</p>
          </div>

          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${billingPeriod === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              aria-pressed={billingPeriod === "monthly"}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${billingPeriod === "annual"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              aria-pressed={billingPeriod === "annual"}
            >
              Annual
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
                Save 20%
              </Badge>
            </button>
          </div>
        </section>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pricing Grid */}
        <section className="grid lg:grid-cols-3 gap-6" aria-label="Pricing plans">
          {pricing.map((tier) => (
            <Card
              key={tier.name}
              className={`relative ${tier.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  <Star className="w-3 h-3 mr-1" aria-hidden="true" />
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center space-y-4">
                <div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {tier.description}
                  </CardDescription>
                </div>
                <div className="space-y-2">
                  {tier.earlyAdopterDiscount && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                      {tier.earlyAdopterDiscount.badge}
                    </Badge>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {billingPeriod === "annual" && tier.annualPrice ? tier.annualPrice : tier.price}
                    </span>
                    {tier.priceNumeric !== null && tier.priceNumeric > 0 && (
                      <span className="text-lg text-muted-foreground">/{tier.period}</span>
                    )}
                  </div>
                  {tier.priceNumeric !== null && tier.priceNumeric > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {billingPeriod === "annual" ? "Billed annually" : "Billed monthly"} • Cancel anytime
                    </p>
                  )}
                  {tier.priceNumeric === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No credit card required
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3" role="list">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="size-4 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {tier.name === "Free" ? (
                  <Button
                    asChild
                    className="w-full"
                    variant="secondary"
                    aria-label="Free plan - no payment required"
                  >
                    <Link to={session ? "/dashboard" : "/login"}>
                      {session ? "Go to Dashboard" : "Start Free"}
                    </Link>
                  </Button>
                ) : tier.name === "Enterprise" ? (
                  <Button
                    onClick={() => {
                      // Handle enterprise contact
                      window.location.href = `mailto:${business.contactPoint.email}?subject=Enterprise Plan Inquiry&body=Hi, I'm interested in the Enterprise plan for Cronicorn. Please send me more information.`;
                    }}
                    variant="outline"
                    className="w-full"
                    aria-label="Contact sales for Enterprise plan"
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout("pro")}
                    disabled={!session || loading === "pro"}
                    className="w-full"
                    aria-label={loading === "pro" ? "Processing..." : session ? `Subscribe to ${tier.name} plan` : "Sign in to subscribe"}
                  >
                    {loading === "pro" ? "Processing..." : session ? tier.cta : "Sign in to subscribe"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </section>

        {/* Refund Policy Highlight */}
        <section className="max-w-3xl mx-auto">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center">
                <Shield className="w-5 h-5 text-green-500" />
                14-day money-back guarantee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Try Premium with zero risk. If you’re not happy in the first 14 days, email us for a full refund—no questions asked.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Trust Indicators (kept honest) */}
        <section className="text-center space-y-6 py-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Built to keep you in control</h2>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">Transparent</span>
                <span>Clear limits by tier</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">Secure</span>
                <span>Encryption in transit by default</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">Talk with us</span>
                <span>Enterprise terms via sales</span>
              </div>
            </div>
          </div>
        </section>

        {/* Test Mode Alert */}
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription>
            <p className="font-semibold mb-2">💳 Test Mode Active</p>
            <p className="mb-2">
              Use test card: <code className="bg-muted px-2 py-1 rounded">4242 4242 4242 4242</code>
            </p>
            <p>Any future expiry date and any 3-digit CVC</p>
          </AlertDescription>
        </Alert>
      </main>
    </>
  );
}
