export default function BackgroundEffects() {
    return (
        <>
            {/* Enhanced blur gradients with improved blending for high-res displays */}
            {/* Larger overlapping areas and increased blur to eliminate hard edges */}
            <div
                className="not-dark:opacity-40 absolute -top-24 -left-24 w-[40%] h-[800px] blur-[80px] md:blur-[120px] will-change-transform"
                style={{
                    animation: "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    background: "radial-gradient(ellipse at center, hsl(var(--secondary) / 0.3) 0%, hsl(var(--secondary) / 0.15) 40%, transparent 70%)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden" as const,
                }}
            />
            <div
                className="not-dark:opacity-40 absolute -top-32 left-[20%] w-[45%] h-[900px] blur-[100px] md:blur-[140px] will-change-transform"
                style={{
                    animation: "pulse 7s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    animationDelay: "2s",
                    background: "radial-gradient(ellipse at center, hsl(217 91% 60% / 0.08) 0%, hsl(221 83% 53% / 0.05) 35%, transparent 65%)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden" as const,
                }}
            />
            <div
                className="not-dark:opacity-40 absolute -top-32 right-[15%] w-[45%] h-[850px] blur-[90px] md:blur-[130px] will-change-transform"
                style={{
                    animation: "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    animationDelay: "1.5s",
                    background: "radial-gradient(ellipse at center, hsl(330 81% 60% / 0.12) 0%, hsl(280 87% 65% / 0.08) 35%, transparent 65%)",
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden" as const,
                }}
            />

            {/* Multi-layer fade mask for smoother transitions */}
            <div
                className="absolute top-0 left-0 w-full h-full min-h-screen pointer-events-none"
                style={{
                    background: "linear-gradient(to bottom, transparent 0%, transparent 30%, hsl(var(--background) / 0.2) 50%, hsl(var(--background) / 0.5) 70%, hsl(var(--background) / 0.8) 85%, hsl(var(--background)) 95%)",
                }}
            />

            {/* Decorative dots - hidden on mobile for performance */}
            <div className="hidden md:block absolute top-16 left-8 w-1 h-1 bg-blue-400/12 rounded-full"></div>
            <div className="hidden md:block absolute top-32 left-24 w-2 h-2 bg-purple-300/10 rounded-full"></div>
            <div className="hidden md:block absolute top-48 left-16 w-1.5 h-1.5 bg-blue-300/15 rounded-full"></div>
            <div className="hidden md:block absolute top-24 right-16 w-1.5 h-1.5 bg-pink-300/12 rounded-full"></div>
            <div className="hidden md:block absolute top-40 right-32 w-1 h-1 bg-blue-400/15 rounded-full"></div>
            <div className="hidden md:block absolute top-56 right-8 w-2 h-2 bg-purple-400/10 rounded-full"></div>
        </>
    )
}