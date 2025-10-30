import { cn } from "@cronicorn/ui-library/lib/utils";
import { ArrowRight, Code, GitCompare, Layers, Sparkles, Zap } from "lucide-react";
import SectionContainer from "@/components/ui/section-container";
import SectionHeader from "@/components/ui/section-header";

/**
 * Quick Answers section displaying FAQ-style content optimized for SEO
 * Uses structured data (schema.org) for enhanced search visibility
 * Enhanced with modern card-based design and visual hierarchy
 */
export default function QuickAnswersSection() {
    const quickAnswers = [
        {
            question: "How does Cronicorn know when to run your code?",
            powerSentence: "AI adapts timing based on what's actually happening in your systems.",
            seoText: "It adapts HTTP request timing based on real conditions. Data pipelines run faster when processing backlogs, social media posts shift to peak engagement windows, web scrapers slow down when rate-limited, billing cycles accelerate near quota limits. AI adjusts intervals automatically with clear reasoning: 'Backlog detected—increasing ETL frequency to 2 minutes.'",
            format: "definition" as const,
            icon: <Zap className="w-5 h-5 text-primary" />
        },
        {
            question: "How does Cronicorn work across different use cases?",
            powerSentence: "One platform adapts to DevOps, e-commerce, content, data pipelines, and more.",
            seoText: "Set up HTTP endpoints with baseline schedules. Cronicorn executes and learns patterns. AI adapts timing based on traffic, failures, engagement, and quotas. Coordinate multi-tier workflows from Extract→Transform→Load to Health→Investigation→Recovery. Every adjustment explained in plain language.",
            format: "rich" as const,
            icon: <Layers className="w-5 h-5 text-blue-500" />
        },
        {
            question: "Real examples: How Cronicorn adapts across domains",
            powerSentence: "Watch intervals automatically adjust to real conditions.",
            seoText: "Data Pipeline: ETL runs every hour → backlog detected → increases to 15min → clears → back to hourly. Content Publishing: Posts scheduled for 9am → high engagement detected → AI suggests immediate follow-up. Web Scraping: Requests every 5sec → rate limit warning → slows to 30sec → recovers → resumes. E-commerce: Health checks every 5min → traffic surge → tightens to 30sec → stabilizes → relaxes",
            format: "examples" as const,
            icon: <Code className="w-5 h-5 text-purple-500" />
        },
        {
            question: "What makes this different from regular cron jobs?",
            powerSentence: "Context-aware automation that understands what's happening now.",
            seoText: "Traditional cron runs on fixed schedules regardless of conditions—whether your pipeline has a massive backlog or your posts are going viral. Cronicorn adapts in real-time: 'Backlog growing—increasing to 2 minutes' or 'Engagement spiking—posting immediately' or 'Rate limit hit—slowing to 30 seconds.'",
            format: "comparison" as const,
            icon: <GitCompare className="w-5 h-5 text-green-500" />
        }
    ] as const;

    const renderContent = (format: string) => {
        switch (format) {
            case "definition":
                return (
                    <>
                        <p className="mb-3 leading-relaxed">
                            Data pipelines <strong className="text-foreground">accelerate when backlogs grow</strong>. Social posts <strong className="text-foreground">shift to peak engagement</strong>. Web scrapers <strong className="text-foreground">slow when rate-limited</strong>. Billing cycles <strong className="text-foreground">speed up near quotas</strong>.
                        </p>
                        <div className="flex items-start gap-2 text-sm bg-primary/10 border-l-2 border-primary px-3 py-2 rounded">
                            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-foreground/90">
                                Every change includes transparent reasoning: <em className="text-primary">"Backlog detected—increasing ETL to 2 minutes."</em>
                            </p>
                        </div>
                    </>
                );

            case "rich":
                return (
                    <div className="space-y-2.5">
                        <p className="flex items-start gap-2">
                            <span className="text-primary font-bold">→</span>
                            <span><strong className="text-foreground">Set up</strong> HTTP endpoints with baseline schedules</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-primary font-bold">→</span>
                            <span><strong className="text-foreground">Execute</strong> and learn patterns automatically</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-primary font-bold">→</span>
                            <span><strong className="text-foreground">Adapt</strong> timing based on traffic, failures, engagement, and quotas</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-primary font-bold">→</span>
                            <span><strong className="text-foreground">Coordinate</strong> multi-tier workflows from Extract→Transform→Load to Health→Investigation→Recovery</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-3 italic">Every adjustment explained in plain language.</p>
                    </div>
                );

            case "examples":
                return (
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors border-l-2 border-blue-500/30">
                            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-foreground">Data Pipeline:</strong> ETL runs every hour → backlog detected → increases to 15min → clears → back to hourly</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors border-l-2 border-purple-500/30">
                            <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-foreground">Content Publishing:</strong> Posts scheduled for 9am → high engagement detected → AI suggests immediate follow-up</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10 transition-colors border-l-2 border-green-500/30">
                            <ArrowRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-foreground">Web Scraping:</strong> Requests every 5sec → rate limit warning → slows to 30sec → recovers → resumes</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-colors border-l-2 border-orange-500/30">
                            <ArrowRight className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-foreground">E-commerce:</strong> Health checks every 5min → traffic surge → tightens to 30sec → stabilizes → relaxes</span>
                        </li>
                    </ul>
                );

            case "comparison":
                return (
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-destructive/5 border-l-4 border-destructive/30 hover:bg-destructive/10 transition-colors">
                            <p className="text-sm font-semibold mb-2 text-destructive">Traditional Cron</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Runs on fixed schedules regardless of conditions—whether your pipeline has a massive backlog or your posts are going viral.
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-primary/5 border-l-4 border-primary/30 hover:bg-primary/10 transition-colors">
                            <p className="text-sm font-semibold mb-2 text-primary">Cronicorn</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Adapts in real-time: <em className="text-foreground">"Backlog growing—increasing to 2 minutes"</em> or <em className="text-foreground">"Engagement spiking—posting immediately"</em> or <em className="text-foreground">"Rate limit hit—slowing to 30 seconds."</em>
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <SectionContainer
            maxWidth="7xl"
            paddingY="lg"
            ariaLabelledBy="quick-answers-heading"
        >
            <SectionHeader
                id="quick-answers-heading"
                heading="Quick Answers"
                description="Everything you need to know about intelligent job scheduling"
            />

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                {quickAnswers.map((qa, index) => (
                    <article
                        key={index}
                        className={cn(
                            "group relative",
                            "bg-gradient-to-b from-card to-card/50",
                            "hover:from-card hover:to-accent/5",
                            "border border-border/50 hover:border-primary/30",
                            "rounded-xl p-8 md:p-10",
                            "shadow-sm hover:shadow-lg",
                            "transform hover:-translate-y-1",
                            "transition-all duration-300 ease-out"
                        )}
                        itemScope
                        itemType="https://schema.org/Question"
                    >
                        {/* Visual anchor icon */}
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                {qa.icon}
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                                <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                            </div>
                        </div>

                        <header className="mb-6">
                            <h3
                                className="font-semibold text-xl md:text-2xl mb-3 tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight"
                                itemProp="name"
                            >
                                {qa.question}
                            </h3>
                            <p className="text-base font-medium text-foreground/90 leading-relaxed">
                                {qa.powerSentence}
                            </p>
                        </header>

                        <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                            {/* Hidden SEO-optimized text content */}
                            <meta itemProp="text" content={qa.seoText} />

                            {/* Visible rich content */}
                            <div className="text-muted-foreground text-sm md:text-base">
                                {renderContent(qa.format)}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </SectionContainer>
    );
}
