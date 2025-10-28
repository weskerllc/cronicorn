import { cn } from "@cronicorn/ui-library/lib/utils";

type TimelineCurrentIndicatorProps = {
  currentTime: number;
  maxTime: number;
  className?: string;
};

export function TimelineCurrentIndicator({ currentTime, maxTime, className }: TimelineCurrentIndicatorProps) {
  const nowPosition = (currentTime / maxTime) * 100 * 0.8 + 10;

  return (
    <div
      className={cn("absolute top-0 bottom-0 transition-all duration-700 ease-out z-20", className)}
      style={{ left: `${nowPosition}%` }}
    >
      {/* Top Scale Indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="relative">
          {/* Main indicator circle */}
          <div className="w-3 h-3 bg-primary rounded-full shadow-md shadow-primary/40 border-2 border-background ring-1 ring-primary/20" />

          {/* Animated glow effect */}
          <div className="absolute inset-0 w-3 h-3 bg-primary/60 blur-sm rounded-full animate-pulse" />

          {/* Scale tick mark extending downward */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-2 bg-primary rounded-full shadow-sm" />
        </div>
      </div>

      {/* Bottom Scale Indicator */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="relative">
          {/* Scale tick mark extending upward */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0.5 h-2 bg-primary rounded-full shadow-sm" />

          {/* Main indicator circle */}
          <div className="w-3 h-3 bg-primary rounded-full shadow-md shadow-primary/40 border-2 border-background ring-1 ring-primary/20" />

          {/* Animated glow effect */}
          <div className="absolute inset-0 w-3 h-3 bg-primary/60 blur-sm rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
