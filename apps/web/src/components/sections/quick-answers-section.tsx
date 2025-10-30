import { cn } from "@cronicorn/ui-library/lib/utils";
import { BlocksIcon } from "lucide-react";
import { useIsMobile } from "../../hooks/use-mobile";
import SectionContainer from "@/components/ui/section-container";
import SectionHeader from "@/components/ui/section-header";
import siteConfig from "@/site-config";

/**
 * Quick Answers section displaying FAQ-style content optimized for SEO
 * Uses structured data (schema.org) for enhanced search visibility
 */
export default function QuickAnswersSection() {
    const isMobile = useIsMobile();

    return (
        <SectionContainer
            maxWidth="7xl"
            paddingY="lg"
            ariaLabelledBy="quick-answers-heading"
        >
            <SectionHeader
                id="quick-answers-heading"
                heading={siteConfig.splash.sections.quickAnswers.heading}
                description={siteConfig.splash.sections.quickAnswers.description}
            />

            <div className="grid border-b border-border/40">
                {siteConfig.zeroClick.quickAnswers.map((qa, index) => (
                    <div className="flex  flex-col md:flex-row ">
                        {/* Graphic */}
                        <div className="flex flex-1/3 bg-red-500">
                            asdf
                        </div>


                        {/* Answer */}
                        <article
                            key={index}
                            className={cn("p-6 md:p-8 flex-2/3 space-y-3 border-t border-border/40 hover:bg-muted/10 hover:shadow-sm transition-all duration-200 md:odd:border-r",)}
                            itemScope
                            itemType="https://schema.org/Question"
                        >
                            <header className="flex items-center gap-2 text-muted-foreground">
                                {/* TODO: Each should have its own icon */}
                                <BlocksIcon className="size-4 " />
                                <h3
                                    className="font-medium text-sm  tracking-tight"
                                    itemProp="name"
                                >
                                    {qa.question}
                                </h3>
                            </header>
                            <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                                <div
                                    itemProp="text"
                                    className="text-muted-foreground/90 text-sm md:text-base leading-relaxed"
                                >
                                    {qa.format === "steps" ? (
                                        <ol className="list-decimal list-inside space-y-1.5">
                                            {qa.answer.split('\n').map((step, i) => (
                                                <li key={i} className="leading-relaxed">
                                                    {step.replace(/^\d+\.\s*/, '')}
                                                </li>
                                            ))}
                                        </ol>
                                    ) : qa.format === "list" ? (
                                        <ul className="list-disc list-inside space-y-1.5">
                                            {qa.answer
                                                .split('\n')
                                                .filter((line) => line.startsWith('•'))
                                                .map((item, i) => (
                                                    <li key={i} className="leading-relaxed">
                                                        {item.replace('•', '').trim()}
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <p className="leading-relaxed">{qa.answer}</p>
                                    )}
                                </div>
                            </div>
                        </article>

                    </div>
                ))}
            </div>
        </SectionContainer>
    );
}
