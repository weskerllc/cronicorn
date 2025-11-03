import { useEffect, useState } from "react";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { brand, urls } from "@cronicorn/content";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@cronicorn/ui-library/components/sheet";
import { Menu } from "lucide-react";
import AppLogo from "../../../logo.svg?react";
import GitHubLogo from "../../../../public/logos/github.svg?react";

const NAV_LINKS = [
    { href: urls.docs.base, label: "Docs" },
    { href: urls.github.discussions, label: "Discussions" },
    { href: urls.docs.apiReference, label: "API Playground" },
    { href: urls.docs.mcpServer, label: "MCP Server" },
] as const;

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
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer"
                        >
                            {link.label}
                        </a>
                    ))}
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

                {/* Mobile Menu */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button
                                className="text-foreground hover:text-foreground/80 transition-colors duration-150 cursor-pointer"
                                aria-label="Toggle navigation menu"
                            >
                                <Menu className="size-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                            <SheetHeader>
                                <SheetTitle className="text-left invisible">{brand.name} Nav Menu</SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-4 px-4">
                                {NAV_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-base font-medium cursor-pointer py-2"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                                <Separator className="my-2" />
                                <a
                                    href={urls.github.repo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors duration-150 cursor-pointer py-2"
                                    aria-label="View Cronicorn on GitHub"
                                >
                                    <GitHubLogo className="size-5 fill-current" />
                                    <span className="text-base font-medium">GitHub</span>
                                </a>

                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </header>
    )
}