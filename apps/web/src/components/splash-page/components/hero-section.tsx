import AppLogo from "../../../icon.svg?react";
import siteConfig from "../../../site-config";

export default function HeroSection() {
    return (
        <>
            {/* Header */}
            <header className="absolute top-0 left-0 w-full z-20 px-6 py-4 md:py-6 bg-transparent backdrop-blur-sm">
                <nav className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Logo/Brand */}
                    <div className="flex items-center space-x-2">
                        <AppLogo className="w-6 h-6 md:w-8 md:h-8 text-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
                        <span className="font-semibold text-lg md:text-xl text-foreground">Cronicorn</span>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
                        <a href={siteConfig.docsUrl} target="_blank" className="text-foreground/80 hover:text-foreground transition-colors text-sm">
                            Docs
                        </a>
                        <a href="/api-playground" className="text-foreground/80 hover:text-foreground transition-colors text-sm">
                            API Playground
                        </a>
                        <a
                            href="/login"
                            className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-medium text-sm hover:bg-primary/20 transition-colors duration-200"
                        >
                            Get Started
                        </a>
                    </div>

                    {/* Mobile CTA */}
                    <div className="md:hidden">
                        <a
                            href="/login"
                            className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-medium text-sm hover:bg-primary/20 transition-colors duration-200"
                        >
                            Get Started
                        </a>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative w-full h-[75vh] md:h-[70vh] flex flex-col items-center justify-center px-6 py-8 md:py-12 overflow-hidden">
                <div className="text-center max-w-5xl relative z-10">
                    <h1 className="font-sans text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-5 tracking-wide leading-tight">
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
                            Get Started Free
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
        </>
    )
}