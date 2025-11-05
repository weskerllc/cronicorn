import { useEffect, useState } from "react";
import { cn } from "@cronicorn/ui-library/lib/utils";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { urls } from "@cronicorn/content";
import GitHubLogo from "../../../../public/logos/github.svg?react";

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

// Secondary links - shown in mobile menu
const SECONDARY_NAV_LINKS = [
    { href: urls.docs.apiReference, label: "API Playground" },
    { href: urls.github.discussions, label: "Discussions" },
] as const;

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Handle mount/unmount with animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            // Delay unmount to allow exit animation
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isVisible) return null;

    return (
        <>
            {/* Menu panel */}
            <nav
                className={cn(
                    "fixed left-0 right-0 bg-background z-500",
                    "md:hidden",
                    "border-b border-border",
                    // Position below header - adjust this value to match your header height
                    "top-[60px]",
                    'h-[calc(100vh-60px)]',
                    'overflow-y-auto',
                    // Animations
                    isOpen
                        ? "animate-in slide-in-from-top-4 fade-in duration-300"
                        : "animate-out slide-out-to-top-4 fade-out duration-300"
                )}

            >
                <div className="flex flex-col gap-4 p-6 items-center">
                    {SECONDARY_NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-foreground/80 transition-colors duration-150 text-base font-medium cursor-pointer py-2"
                            onClick={onClose}
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
                        onClick={onClose}
                    >
                        <GitHubLogo className="size-5 fill-current" aria-hidden="true" />
                        <span className="text-base font-medium">GitHub</span>
                    </a>
                </div>
            </nav>
        </>
    );
}
