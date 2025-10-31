import { useEffect, useState } from "react";
import { cn } from "@cronicorn/ui-library/lib/utils";
import AppLogo from "../../../icon.svg?react";
import siteConfig from "../../../site-config";

export default function HeaderSection() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 5);
        };

        // Check initial state
        handleScroll();

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={cn("fixed top-0 left-0 w-full z-20 ", isScrolled && "bg-background/80 backdrop-blur-sm border-b border-border/50")}>

            {/* <header className={`fixed top-0 left-0 w-full z-20 bg-transparent backdrop-blur-sm transition-all duration-200 ${isScrolled ? 'border-b border-border/50' : ''}`}> */}
            <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
                {/* Logo/Brand */}
                <a href={siteConfig.url} className="flex items-center space-x-2">
                    <AppLogo className="size-7 fill-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
                    <span className="font-medium text-lg text-foreground">{siteConfig.siteName}</span>
                </a>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-6">
                    <a href='/faq' className="text-foreground/70 hover:text-foreground transition-colors duration-150 text-sm font-medium">
                        FAQ
                    </a>
                    <a href="/api" target="_blank" className="text-foreground/70 hover:text-foreground transition-colors duration-150 text-sm font-medium">
                        API Playground
                    </a>
                    <a
                        href="/login"
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                        Get Started
                    </a>
                </div>

                {/* Mobile CTA */}
                <div className="md:hidden">
                    <a
                        href="/login"
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all duration-150"
                    >
                        Get Started
                    </a>
                </div>
            </nav>
        </header>
    )
}