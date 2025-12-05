import { Link } from "@tanstack/react-router";
import { AlertCircle, Brain, Check, Clock, Play } from "lucide-react";

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

function getStatusVariant(status?: string) {
    if (status === "success") return "success";
    if (status === "running") return "secondary";
    return "destructive";
}

function getStatusIcon(type: "run" | "session", status?: string) {
    if (type === "session") return Brain;
    if (status === "success") return Check;
    if (status === "running") return Play;
    return AlertCircle;
}

export function ActivityEventItem({ event }: { event: ActivityEvent }) {
    const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const isRun = event.type === "run";
    const StatusIcon = getStatusIcon(event.type, event.status);
    const statusVariant = isRun ? getStatusVariant(event.status) : "secondary";

    return (
        <Link
            to={isRun ? "/runs/$id" : "/endpoints/$id"}
            params={{ id: isRun ? event.id : event.endpointId }}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
        >
            {/* Status icon */}
            <div className={cn(
                "shrink-0 size-6 rounded-full flex items-center justify-center",
                statusVariant === "success" && "bg-success/20 text-success",
                statusVariant === "destructive" && "bg-destructive/20 text-destructive",
                statusVariant === "secondary" && "bg-muted text-muted-foreground"
            )}>
                <StatusIcon className="size-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{event.endpointName}</span>
                    {isRun && event.status && (
                        <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0 capitalize">
                            {event.status}
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
