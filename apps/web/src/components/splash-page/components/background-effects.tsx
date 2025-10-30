export default function BackgroundEffects() {
    return (
        <>
            {/* Blur gradients */}
            <div
                className="absolute top-0 left-0 w-1/4 h-96 bg-gradient-to-br from-background/50 via-secondary/40 to-background/25 blur-3xl animate-pulse"
                style={{ animationDuration: "8s" }}
            />
            <div
                className="absolute top-0 left-16 w-1/4 h-96 bg-gradient-to-br from-blue-400/2 via-blue-500/2 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "6s", animationDelay: "1s" }}
            />
            <div
                className="absolute top-0 left-1/4 w-1/3 h-[28rem] bg-gradient-to-br from-blue-500/10 via-blue-600/10 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "7s", animationDelay: "2s" }}
            />
            <div
                className="absolute top-0 left-2/5 w-1/4 h-80 bg-gradient-to-br from-blue-400/18 via-blue-500/12 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "5s", animationDelay: "3s" }}
            />
            <div
                className="absolute top-0 right-1/4 w-1/3 h-80 bg-gradient-to-bl from-pink-500/25 via-purple-500/20 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "6s", animationDelay: "1.5s" }}
            />
            <div
                className="absolute top-0 right-0 w-1/4 h-96 bg-gradient-to-bl from-pink-400/18 via-purple-400/12 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "8s", animationDelay: "4s" }}
            />

            {/* Decorative dots */}
            <div className="absolute top-16 left-8 w-1 h-1 bg-blue-400/12 rounded-full"></div>
            <div className="absolute top-32 left-24 w-2 h-2 bg-purple-300/10 rounded-full"></div>
            <div className="absolute top-48 left-16 w-1.5 h-1.5 bg-blue-300/15 rounded-full"></div>
            <div className="absolute top-64 left-32 w-1 h-1 bg-pink-400/12 rounded-full"></div>
            <div className="absolute top-80 left-12 w-2.5 h-2.5 bg-blue-500/8 rounded-full"></div>

            <div className="absolute top-24 right-16 w-1.5 h-1.5 bg-pink-300/12 rounded-full"></div>
            <div className="absolute top-40 right-32 w-1 h-1 bg-blue-400/15 rounded-full"></div>
            <div className="absolute top-56 right-8 w-2 h-2 bg-purple-400/10 rounded-full"></div>
            <div className="absolute top-72 right-24 w-1 h-1 bg-pink-500/12 rounded-full"></div>
            <div className="absolute top-88 right-40 w-1.5 h-1.5 bg-blue-300/10 rounded-full"></div>

            <div className="absolute bottom-16 left-16 w-2 h-2 bg-purple-400/12 rounded-full"></div>
            <div className="absolute bottom-32 left-8 w-1 h-1 bg-blue-500/15 rounded-full"></div>
            <div className="absolute bottom-48 left-28 w-1.5 h-1.5 bg-pink-300/10 rounded-full"></div>
            <div className="absolute bottom-64 left-20 w-1 h-1 bg-blue-400/12 rounded-full"></div>

            <div className="absolute bottom-20 right-12 w-1.5 h-1.5 bg-pink-400/15 rounded-full"></div>
            <div className="absolute bottom-36 right-28 w-1 h-1 bg-blue-300/12 rounded-full"></div>
            <div className="absolute bottom-52 right-16 w-2 h-2 bg-purple-300/10 rounded-full"></div>
            <div className="absolute bottom-68 right-36 w-1 h-1 bg-pink-500/12 rounded-full"></div>

            <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-blue-400/10 rounded-full"></div>
            <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-purple-400/12 rounded-full"></div>
            <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-pink-300/15 rounded-full"></div>
        </>
    )
}