import { ArrowRight } from "lucide-react";
import { brand, urls } from "@cronicorn/content";

export default function HeroSection() {
    return (
        <section className="relative w-full min-h-[60vh] md:min-h-[55vh] flex flex-col items-center justify-center px-6 py-20 md:py-24 overflow-hidden border-b border-border/40">
            <div className="text-center max-w-4xl relative z-10">
                <h1 className="font-sans text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold mb-5 tracking-tight leading-[1.1]">
                    {brand.oneLiners.primary}
                </h1>
                <p className="font-sans text-muted-foreground text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto mb-8">
                    {brand.tagline}
                </p>

                {/* CTA Section */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <a
                        href={urls.product.signup}
                        className="group px-7 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                        Start Free Trial
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </a>
                    <a
                        href={urls.docs.base}
                        className="px-7 py-3 border border-border text-foreground rounded-lg font-medium text-sm hover:bg-accent/50 hover:border-foreground/20 transition-all duration-150"
                    >
                        View Documentation
                    </a>
                </div>
            </div>
        </section>

    )
}