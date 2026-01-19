import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Brain, Check, ChevronDown, ChevronUp, Clock, Play, Settings2, Zap } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
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
    // Session-specific fields
    reasoning?: string;
    toolCalls?: Array<{ tool: string; args?: unknown; result?: unknown }>;
};

/** Action tools that make scheduling changes */
const ACTION_TOOLS = ["propose_interval", "propose_next_time", "pause_until", "clear_hints"];

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
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const reasoningRef = useRef<HTMLParagraphElement>(null);

    const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const isRun = event.type === "run";
    const hasReasoning = !isRun && event.reasoning;
    const RunStatusIcon = isRun ? getRunStatusIcon(event.status) : null;
    const statusVariant = isRun ? getRunStatusVariant(event.status) : null;

    // Count action tools called for AI sessions
    const actionToolCount = useMemo(() => {
        if (isRun || !event.toolCalls) return 0;
        return event.toolCalls.filter(call => ACTION_TOOLS.includes(call.tool)).length;
    }, [isRun, event.toolCalls]);

    useEffect(() => {
        if (!hasReasoning) return;
        const checkClamping = () => {
            if (reasoningRef.current) {
                setIsClamped(reasoningRef.current.scrollHeight > reasoningRef.current.clientHeight);
            }
        };
        checkClamping();
        const timeoutId = setTimeout(checkClamping, 100);
        window.addEventListener("resize", checkClamping);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("resize", checkClamping);
        };
    }, [hasReasoning, event.reasoning]);

    return (
        <div className="rounded-md transition-colors hover:bg-accent/50">
            {/* Main row - clickable link to detail page */}
            <Link
                to={isRun ? "/runs/$id" : "/ai-sessions/$id"}
                params={{ id: event.id }}
                preload={false}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
            >
                {/* Event type icon */}
                <div className={cn(
                    "shrink-0 size-5 rounded-full flex items-center justify-center",
                    isRun ? "bg-primary/10 text-primary" : "bg-violet-500/15 text-violet-500"
                )}>
                    {isRun ? (
                        <Zap className="size-3" />
                    ) : (
                        <Brain className="size-3" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{event.endpointName}</span>
                        {isRun && event.status && RunStatusIcon && statusVariant && (
                            <Badge variant={statusVariant} className="text-[10px] px-1 py-0 gap-0.5 capitalize">
                                <RunStatusIcon className="size-2.5" />
                                {event.status}
                            </Badge>
                        )}
                        {!isRun && (
                            <>
                                <Badge variant="outline" className="text-[10px] px-1 py-0 text-violet-500 border-violet-500/30">
                                    AI
                                </Badge>
                                {actionToolCount > 0 && (
                                    <Badge className="text-[10px] px-1 py-0 gap-0.5">
                                        <Settings2 className="size-2.5" />
                                        {actionToolCount}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {isRun && event.durationMs !== undefined && (
                        <span className="flex items-center gap-0.5">
                            <Clock className="size-2.5" />
                            {event.durationMs}ms
                        </span>
                    )}
                    {!isRun && event.tokenUsage !== undefined && (
                        <span>{event.tokenUsage.toLocaleString()} tokens</span>
                    )}
                    <span>{time}</span>
                </div>
            </Link>

            {/* AI Reasoning section - expandable, not part of link */}
            {hasReasoning && (
                <div className="px-3 pb-2 pl-10">
                    <p
                        ref={reasoningRef}
                        className={cn(
                            "text-xs text-muted-foreground leading-relaxed",
                            !isExpanded && "line-clamp-2"
                        )}
                    >
                        {event.reasoning}
                    </p>
                    {isClamped && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground mt-0.5"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="size-3 mr-0.5" />
                                    Less
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="size-3 mr-0.5" />
                                    More
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
