import { ArrowRight } from "lucide-react";
import { brand, urls } from "@cronicorn/content";
import { IconSparkles } from "@tabler/icons-react";

export default function HeroSection() {
    return (
        <section className="relative w-full lg:items-start flex flex-col items-center justify-center">
            <div className="flex flex-col text-center lg:text-left lg:items-start items-center max-w-4xl relative z-10 space-y-6 lg:space-y-8">
                <h1 className="font-sans text-foreground text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-balance max-w-[280px] md:max-w-[500px] lg:max-w-[600px]">
                    {brand.title}
                </h1>
                <p className="font-sans text-muted-foreground text-lg md:text-xl lg:text-2xl leading-relaxed max-w-[350px] md:max-w-[450px] lg:max-w-[500px] lg:mx-0 mx-auto">
                    {brand.description}
                </p>

                {/* CTA Section */}
                <div className="flex flex-col gap-4 justify-center lg:justify-start w-full items-center lg:items-start pt-2">
                    <div className="flex gap-4 justify-center lg:justify-start w-full items-center">
                        <a
                            href={urls.product.login}
                            className="group px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </a>
                        <a
                            href={urls.github.repo}
                            className="px-5 py-2 border-2 border-border text-foreground rounded-lg font-semibold text-base hover:border-foreground/30 transition-all duration-200"
                        >
                            View on Github
                        </a>
                    </div>


                    {/* AI Assistant Callout - Optimized for mobile performance */}
                    <a
                        href={urls.docs.mcpServer}
                        className="group relative flex text-left items-center gap-2 px-4 py-2 rounded-2xl border-2 bg-blue-300 border-blue-300 hover:border-blue-400 dark:bg-indigo-900 dark:border-indigo-700/50 dark:hover:border-indigo-500/70 transition-all duration-200 max-w-sm"
                    >
                        <span className="text-2xl"><IconSparkles /></span>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Recommended</span>
                            <span className="flex items-center gap-2 text-xs text-foreground/90 group-hover:text-foreground transition-colors">
                                Get started with your AI assistant                             <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform duration-200" />

                            </span>
                        </div>
                    </a>

                </div>
            </div>
        </section>

    )
}