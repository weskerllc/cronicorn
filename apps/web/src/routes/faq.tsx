import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { AlertCircle, Check, Clock, Shield, Star, Zap } from "lucide-react";

import { PageHeader } from "../components/page-header";
import { useSession } from "@/lib/auth-client";
import { SEO, createFAQSchema, createProductSchema } from "@/components/SEO";
import siteConfig from "@/site-config";

export const Route = createFileRoute("/faq")({
    component: Pricing,
});

const faq = [
    {
        question: "What is your return policy?",
        answer:
            "You can return unused items in their original packaging within 30 days for a refund or exchange. Contact support for assistance.",
    },
    {
        question: "How do I track my order?",
        answer:
            "Track your order using the link provided in your confirmation email, or log into your account to view tracking details.",
    },
    {
        question: "Do you ship internationally?",
        answer:
            "Yes, we ship worldwide. Shipping fees and delivery times vary by location, and customs duties may apply for some countries.",
    },
    {
        question: "What payment methods do you accept?",
        answer:
            "We accept Visa, MasterCard, American Express, PayPal, Apple Pay, and Google Pay, ensuring secure payment options for all customers.",
    },
    {
        question: "What if I receive a damaged item?",
        answer:
            "Please contact our support team within 48 hours of delivery with photos of the damaged item. We’ll arrange a replacement or refund.",
    },
];

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

    // const features = [
    //     {
    //         icon: <Zap className="w-5 h-5 text-primary" />,
    //         title: "AI-Powered Intelligence",
    //         description: "Smart scheduling that learns from your patterns"
    //     },
    //     {
    //         icon: <Shield className="w-5 h-5 text-primary" />,
    //         title: "Enterprise Security",
    //         description: "Bank-grade encryption and compliance ready"
    //     },
    //     {
    //         icon: <Clock className="w-5 h-5 text-primary" />,
    //         title: "99.9% Uptime",
    //         description: "Reliable infrastructure you can depend on"
    //     }
    // ];

    return (
        <>
            <SEO
                title="Pricing Plans - Choose Your AI Scheduling Solution"
                description={siteConfig.metaDescriptions.pricing}
                keywords={["pricing", "plans", "subscription", "AI scheduling cost", "cron job pricing", "enterprise scheduling"]}
                url="/pricing"
                structuredData={tierStructuredData}
            />

            <main className="max-w-7xl mx-auto space-y-16 p-8" role="main">
                <PageHeader
                    text="Frequently Asked Questions"
                    description="Get answers to common questions about Cronicorn"
                />

                <Accordion type="single" className="mt-6" defaultValue="question-0">
                    {siteConfig.faq.primary.map(({ question, answer }, index) => (
                        <AccordionItem key={question} value={`question-${index}`}>
                            <AccordionTrigger className="text-left text-lg">
                                {question}
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-muted-foreground">
                                {answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </main>
        </>
    );
}
