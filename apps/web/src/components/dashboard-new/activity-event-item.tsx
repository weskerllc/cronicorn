import { Link } from "@tanstack/react-router";
import { AlertCircle, Brain, Check, Clock, Play, Zap } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { cn } from "@cronicorn/ui-library/lib/utils";

export type ActivityEvent = {
    type: "run" | "session";
    id: string;
    endpointId: string;
    endpointName: string;
    timestamp: string;
    status?: string;
    durationMs?: number;
    tokenUsage?: number;
};

function getRunStatusIcon(status?: string) {
    if (status === "success") return Check;
    if (status === "running") return Play;
    return AlertCircle;
}

function getRunStatusVariant(status?: string) {
    if (status === "success") return "success";
    if (status === "running") return "secondary";
    return "destructive";
}

export function ActivityEventItem({ event }: { event: ActivityEvent }) {
    const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const isRun = event.type === "run";
    const RunStatusIcon = isRun ? getRunStatusIcon(event.status) : null;
    const statusVariant = isRun ? getRunStatusVariant(event.status) : null;

    return (
        <Link
            to={isRun ? "/runs/$id" : "/endpoints/$id"}
            params={{ id: isRun ? event.id : event.endpointId }}
            preload={false}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
        >
            {/* Event type icon - consistent per type */}
            <div className={cn(
                "shrink-0 size-6 rounded-full flex items-center justify-center",
                isRun ? "bg-primary/10 text-primary" : "bg-violet-500/15 text-violet-500"
            )}>
                {isRun ? (
                    <Zap className="size-3.5" />
                ) : (
                    <Brain className="size-3.5" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{event.endpointName}</span>
                    {isRun && event.status && RunStatusIcon && statusVariant && (
                        <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0 gap-0.5 capitalize">
                            <RunStatusIcon className="size-2.5" />
                            {event.status}
                        </Badge>
                    )}
                    {!isRun && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-violet-500 border-violet-500/30">
                            AI
                        </Badge>
                    )}
                </div>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                {isRun && event.durationMs !== undefined && (
                    <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {event.durationMs}ms
                    </span>
                )}
                {!isRun && event.tokenUsage !== undefined && (
                    <span>{event.tokenUsage.toLocaleString()} tokens</span>
                )}
                <span>{time}</span>
            </div>
        </Link>
    );
}
