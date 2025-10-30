import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "../components/page-header";
import { SEO, createFAQSchema, createProductSchema } from "@/components/SEO";
import siteConfig from "@/site-config";

export const Route = createFileRoute("/faq")({
    component: Faq,
});



function Faq() {


    const faqs = [...siteConfig.faq.primary];

    // Structured data for each pricing tier
    const tierStructuredData = {
        "@context": "https://schema.org",
        "@graph": [
            ...siteConfig.pricing.map((tier) => createProductSchema(tier)),
            createFAQSchema(faqs)
        ]
    };

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
                    {faqs.map(({ question, answer }, index) => (
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
