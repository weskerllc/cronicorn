export default function BackgroundEffects() {
    return (
        <>
            {/* Optimized blur gradients - reduced blur and animation on mobile */}
            <div
                className="not-dark:opacity-40 absolute top-0 left-0 w-1/4 h-96 bg-gradient-to-br from-background/50 via-secondary/40 to-background/25 blur-2xl md:blur-3xl will-change-[opacity]"
                style={{ 
                    animation: "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
            />
            <div
                className="not-dark:opacity-40 absolute top-0 left-1/4 w-1/3 h-[28rem] bg-gradient-to-br from-blue-500/10 via-blue-600/10 to-transparent blur-2xl md:blur-3xl will-change-[opacity]"
                style={{ 
                    animation: "pulse 7s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    animationDelay: "2s"
                }}
            />
            <div
                className="not-dark:opacity-40 absolute top-0 right-1/4 w-1/3 h-80 bg-gradient-to-bl from-pink-500/25 via-purple-500/20 to-transparent blur-2xl md:blur-3xl will-change-[opacity]"
                style={{ 
                    animation: "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    animationDelay: "1.5s"
                }}
            />

            {/* Fade mask overlay - creates smooth transition at bottom */}
            <div
                className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none"
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