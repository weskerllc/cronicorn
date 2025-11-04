import { Button } from "@cronicorn/ui-library/components/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import { urls } from "@cronicorn/content";
import SectionContainer from "@/components/ui/section-container";

/**
 * Call-to-action section with primary and secondary actions
 * Reusable component for consistent CTA display across pages
 */
export default function CTASection() {
    return (
        <SectionContainer
            paddingY="none"
            borderBottom
            className="flex items-center justify-center px-6 overflow-hidden pb-20"
        >
            <div className="text-center max-w-4xl relative z-10 flex flex-col md:items-center md:flex-row md:gap-12 gap-6">
                <a
                    href={urls.product.login}
                    className="group px-12 py-6 bg-primary text-primary-foreground rounded-full font-medium text-lg hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md flex items-center gap-2"
                >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                </a>

                <div className="flex flex-col">
                    <Button variant={'outline'} size={'lg'} className="rounded-full" asChild>
                        <a
                            href={urls.github.repo}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on GitHub
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </a>
                    </Button>
                </div>
            </div>
        </SectionContainer>
    );
}
