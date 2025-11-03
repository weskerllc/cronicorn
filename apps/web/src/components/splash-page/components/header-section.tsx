import { useEffect, useState } from "react";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { brand, urls } from "@cronicorn/content";
import { Separator } from "@cronicorn/ui-library/components/separator";
import AppLogo from "../../../logo.svg?react";
import GitHubLogo from "../../../../public/logos/github.svg?react";

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

            <nav className="flex items-center   px-4 md:px-8 justify-between max-w-7xl mx-auto  py-4">
                {/* Logo/Brand */}
                <a href={urls.product.home} className="flex items-center space-x-2">
                    <AppLogo className="size-6 fill-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
                    <span className="font-semibold text-lg text-foreground">{brand.name}</span>
                </a>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-6">
                    <a href={urls.docs.base} className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer">
                        Docs
                    </a>
                    <a href={urls.github.discussions} className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer">
                        Discussions
                    </a>
                    <a href={urls.docs.apiReference} className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer">
                        API Playground
                    </a>
                    <a href={urls.docs.mcpServer} className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer">
                        MCP Server
                    </a>
                    <Separator orientation="vertical" className=" h-6 data-[orientation=vertical]:h-6" />
                    <a
                        href={urls.github.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-foreground/80 transition-colors duration-150 cursor-pointer"
                        aria-label="View Cronicorn on GitHub"
                    >
                        <GitHubLogo className="size-5 fill-current" />
                    </a>

                </div>

                {/* Mobile CTA */}
                <div className="md:hidden">
                    <a
                        href={urls.product.login}
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all duration-150"
                    >
                        Get Started
                    </a>
                </div>
            </nav>
        </header>
    )
}