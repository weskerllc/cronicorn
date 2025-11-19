import { faq, metaDescriptions, pageTitles } from "@cronicorn/content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@cronicorn/ui-library/components/accordion";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "../../components/composed/page-header";
import { createFAQSchema, createSEOHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/faq")({
    head: () => {
        const faqStructuredData = {
            "@context": "https://schema.org",
            "@graph": [createFAQSchema(faq)]
        };

        return createSEOHead({
            title: pageTitles.faq,
            description: metaDescriptions.faq,
            keywords: ["faq", "questions", "AI scheduling help", "intelligent cron questions", "adaptive monitoring faq"],
            url: "/faq",
            structuredData: faqStructuredData,
        });
    },
    component: Faq,
});



function Faq() {
    const faqs = faq;

    return (
        <>
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
