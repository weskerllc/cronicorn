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
      {/* Subtle vertical line */}
      {/* <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px bg-primary/30" /> */}

      {/* Top indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-2 h-2 bg-primary rounded-full border border-background" />
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-1.5 bg-primary/30 rounded-full" />

      </div>

      {/* Bottom indicator */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0.5 h-1.5 bg-primary/30 rounded-full" />

        <div className="w-2 h-2 bg-primary rounded-full border border-background" />
      </div>
    </div>
  );
}
