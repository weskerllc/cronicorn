import siteConfig from "../../../site-config";

export default function HeroSection() {
    return (
        <section className="relative w-full h-[65vh] md:h-[60vh] flex flex-col items-center justify-center px-6 py-8 md:py-12 overflow-hidden">
            <div className="text-center max-w-4xl relative z-10">
                <h1 className="font-sans text-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-5 tracking-wide leading-tight">
                    {siteConfig.headlines.hero.primary}
                </h1>
                <p className="font-sans text-muted-foreground text-base sm:text-lg md:text-xl lg:text-2xl font-light tracking-wide leading-relaxed max-w-3xl mx-auto mb-2">
                    {siteConfig.headlines.hero.secondary}
                </p>
                <p className="font-sans text-primary text-sm md:text-base font-medium mb-6">
                    {siteConfig.headlines.hero.emotional}
                </p>
                {/* CTA Section */}
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
                    <a
                        href="/login"
                        className="px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm md:text-base hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Join Early Access
                    </a>
                    <a
                        href="/docs"
                        className="px-6 md:px-8 py-3 md:py-4 border border-border text-foreground rounded-lg font-medium text-sm md:text-base hover:bg-accent/50 transition-colors duration-200"
                    >
                        View Documentation
                    </a>
                </div>
            </div>
        </section>

    )
}