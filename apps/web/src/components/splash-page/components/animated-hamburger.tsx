import { cn } from "@cronicorn/ui-library/lib/utils";

interface AnimatedHamburgerProps {
    isOpen: boolean;
    className?: string;
}

export function AnimatedHamburger({ isOpen, className }: AnimatedHamburgerProps) {
    return (
        <span className={cn("relative inline-block w-4 h-3.5 overflow-hidden", className)}>
            {/* Top line - widest initially */}
            <span
                className={cn(
                    "absolute right-0 h-0.5 bg-current rounded-full",
                    "transition-all duration-250 ease-in-out origin-center",
                    isOpen
                        ? "top-1.5 -rotate-45 w-4 translate-x-0"
                        : "top-0 w-4 translate-x-0 group-hover:w-3"
                )}
            />
            {/* Middle line - shortest initially */}
            <span
                className={cn(
                    "absolute right-0 h-0.5 bg-current rounded-full",
                    "transition-all duration-250 ease-in-out",
                    isOpen
                        ? "top-1.5 translate-x-4 opacity-0 w-4"
                        : "top-1.5 w-2 translate-x-0 group-hover:w-4"
                )}
            />
            {/* Bottom line - second widest initially */}
            <span
                className={cn(
                    "absolute right-0 h-0.5 bg-current rounded-full",
                    "transition-all duration-250 ease-in-out origin-center",
                    isOpen
                        ? "top-1.5 rotate-45 w-4 translate-x-0"
                        : "top-3 w-3 translate-x-0 group-hover:w-2"
                )}
            />
        </span>
    );
}
