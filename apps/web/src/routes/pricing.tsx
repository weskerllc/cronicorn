import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { AlertCircle, Check, Clock, Shield, Star, Zap } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { SEO, createFAQSchema, createProductSchema } from "@/components/SEO";
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

  // FAQ data for structured data
  const faqs = [
    {
      question: "Can I change my plan at any time?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle."
    },
    {
      question: "What happens if I exceed my job limits?",
      answer: "If you exceed your plan limits, you'll be notified and given the option to upgrade. Your existing jobs will continue to work while you decide."
    },
    {
      question: "Do you offer annual discounts?",
      answer: "Yes! Annual subscriptions receive a 20% discount. Contact our support team to set up annual billing."
    },
    {
      question: "Is there an SLA for Enterprise customers?",
      answer: "Yes, Enterprise customers receive a 99.9% uptime SLA with dedicated support and priority issue resolution."
    },
    {
      question: "Can I cancel at any time?",
      answer: "Absolutely. You can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period."
    }
  ];

  // Structured data for each pricing tier
  const tierStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      ...siteConfig.pricing.map((tier) => createProductSchema(tier)),
      createFAQSchema(faqs)
    ]
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-primary" />,
      title: "AI-Powered Intelligence",
      description: "Smart scheduling that learns from your patterns"
    },
    {
      icon: <Shield className="w-5 h-5 text-primary" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption and compliance ready"
    },
    {
      icon: <Clock className="w-5 h-5 text-primary" />,
      title: "99.9% Uptime",
      description: "Reliable infrastructure you can depend on"
    }
  ];

  return (
    <>
      <SEO
        title={siteConfig.pageTitles.pricing}
        description={siteConfig.metaDescriptions.pricing}
        keywords={["pricing", "plans", "subscription", "AI scheduling cost", "cron job pricing", "enterprise scheduling"]}
        url="/pricing"
        structuredData={tierStructuredData}
      />

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
              Start free and scale with your needs. All plans include our core AI scheduling features.
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
                {feature.icon}
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>

        {/* Pricing Grid */}
        <section className="grid lg:grid-cols-3 gap-8" aria-label="Pricing plans">
          {siteConfig.pricing.map((tier) => (
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
                      window.location.href = `mailto:${siteConfig.business.contactPoint.email}?subject=Enterprise Plan Inquiry&body=Hi, I'm interested in the Enterprise plan for Cronicorn. Please send me more information.`;
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
              Sign in with GitHub to start scheduling with AI intelligence
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
            <h2 className="text-2xl font-bold">Trusted by Developers Worldwide</h2>
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
