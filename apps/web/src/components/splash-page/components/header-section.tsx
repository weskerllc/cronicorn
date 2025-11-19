import { useEffect, useState } from "react";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { brand, urls } from "@cronicorn/content";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Button } from "@cronicorn/ui-library/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@cronicorn/ui-library/components/avatar";
import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import AppLogo from "../../../logo.svg?react";
import GitHubLogo from "../../../../public/logos/github.svg?react";
import { AnimatedHamburger } from "./animated-hamburger";
import { MobileMenu } from "./mobile-menu";
import { useSession } from "@/lib/auth-client";

// Primary links - visible on all screen sizes
const PRIMARY_NAV_LINKS = [
    { href: urls.docs.base, label: "Docs" },
    { href: urls.docs.mcpServer, label: "MCP Server" },
] as const;

// Secondary links - desktop only, moved to mobile menu
const SECONDARY_NAV_LINKS = [
    { href: urls.docs.apiReference, label: "API Playground" },
    { href: urls.github.discussions, label: "Get Help" },
] as const;

export default function HeaderSection() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { data: session } = useSession();

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
                    {PRIMARY_NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer"
                        >
                            {link.label}
                        </a>
                    ))}
                    {SECONDARY_NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
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
                        <GitHubLogo className="size-5 fill-current" aria-hidden="true" />
                    </a>
                    {session && (
                        <>
                            <Separator orientation="vertical" className=" h-6 data-[orientation=vertical]:h-6" />
                            <Button asChild variant="default" size="sm">
                                <Link to="/dashboard">Dashboard</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden flex items-center gap-3">

                    {/* Primary links visible on mobile */}
                    {PRIMARY_NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-sm font-medium cursor-pointer"
                        >
                            {link.label}
                        </a>
                    ))}

                    <Separator orientation="vertical" className=" h-6 data-[orientation=vertical]:h-6" />

                    {/* User avatar for logged in users on mobile */}
                    {session && (

                        <>

                            <Link to="/dashboard" className="flex items-center">
                                <Avatar className="size-8 bg-primary">
                                    <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
                                    <AvatarFallback className="bg-primary">
                                        <User className="size-4 text-primary-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                            </Link>

                            <Separator orientation="vertical" className=" h-6 data-[orientation=vertical]:h-6" />

                        </>

                    )}

                    {/* Hamburger menu button */}
                    <button
                        className="group text-foreground hover:text-foreground/80 transition-colors duration-150 cursor-pointer"
                        aria-label="Toggle navigation menu"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <AnimatedHamburger isOpen={isMenuOpen} />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Panel */}
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </header>
    )
}