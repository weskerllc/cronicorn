import AppLogo from "../../../icon.svg?react";
import siteConfig from "../../../site-config";

export default function HeaderSection() {
    return (
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
    )
}