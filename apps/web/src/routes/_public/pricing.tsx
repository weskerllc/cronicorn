import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { AlertCircle, Check, Clock, Shield, Star, Zap } from "lucide-react";

import { business, metaDescriptions, pageTitles, pricing, pricingFAQs, pricingFeatures, pricingText } from "@cronicorn/content";
import { useSession } from "@/lib/auth-client";
import { createFAQSchema, createProductSchema, createSEOHead } from "@/lib/seo";

// Icon map for pricing features
const featureIconMap: Record<string, React.ReactNode> = {
  "AI-Powered Intelligence": <Zap className="w-5 h-5 text-primary" />,
  "Enterprise Security": <Shield className="w-5 h-5 text-primary" />,
  "99.9% Uptime": <Clock className="w-5 h-5 text-primary" />,
};

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

  const features = pricingFeatures;
  const faqs = pricingFAQs;

  return (
    <>
      <main className="max-w-7xl mx-auto space-y-16 p-8" role="main">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="space-y-4">
            <Badge variant="secondary" className="mb-4">
              💎 Transparent Pricing
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {pricingText.hero.subtitle}
            </p>
          </div>
        </section>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Features Overview */}
        <section className="grid md:grid-cols-3 gap-6 py-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center space-y-3">
              <div className="flex justify-center">
                {featureIconMap[feature.title]}
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>

        {/* Pricing Grid */}
        <section className="grid lg:grid-cols-3 gap-8" aria-label="Pricing plans">
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
                <div className="space-y-1">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.priceNumeric && (
                      <span className="text-lg text-muted-foreground">/{tier.period}</span>
                    )}
                  </div>
                  {tier.priceNumeric && (
                    <p className="text-sm text-muted-foreground">
                      Billed monthly • Cancel anytime
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
                {tier.name === "Starter" ? (
                  <Button
                    disabled
                    className="w-full"
                    variant="secondary"
                    aria-label="Free plan - no payment required"
                  >
                    Current Plan
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

        {/* Call to Action for Non-Authenticated Users */}
        {!session && (
          <section className="text-center space-y-4 py-8 bg-muted/30 rounded-lg">
            <h2 className="text-2xl font-semibold">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {pricingText.cta.subtitle}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/login">Sign In with GitHub</Link>
              </Button>
            </div>
          </section>
        )}

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

        {/* Trust Indicators */}
        <section className="text-center space-y-6 py-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{pricingText.testimonials.heading}</h2>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">99.9%</span>
                <span>Uptime SLA</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">24/7</span>
                <span>Support Available</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">SOC 2</span>
                <span>Compliant</span>
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
