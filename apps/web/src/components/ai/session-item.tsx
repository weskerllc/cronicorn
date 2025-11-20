import { AlertCircle, Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AISession = {
    id: string;
    analyzedAt: string;
    reasoning: string;
    toolCalls: Array<{ tool: string; args?: unknown; result?: unknown }>;
    tokenUsage: number | null;
    durationMs: number | null;
};

// Type guards and safe accessors
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeNumber(value: unknown): number | null {
    return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function safeString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function safeDate(value: unknown): Date | null {
    if (typeof value !== "string") return null;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) ? date : null;
}

function safeStringify(value: unknown, fallback = "null"): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return fallback;
    }
}

function formatDateCompact(date: Date | null): string | null {
    if (!date) return null;
    try {
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return null;
    }
}

export function AISessionItem({
    session,
    formatDuration,
}: {
    session: AISession;
    formatDuration: (ms: number | null) => string | null;
}) {
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
    const [expandedToolIndex, setExpandedToolIndex] = useState<number | null>(null);
    const [isClamped, setIsClamped] = useState(false);
    const reasoningRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const checkClamping = () => {
            if (reasoningRef.current) {
                setIsClamped(reasoningRef.current.scrollHeight > reasoningRef.current.clientHeight);
            }
        };

        // Check immediately and after a short delay for layout to settle
        checkClamping();
        const timeoutId = setTimeout(checkClamping, 100);

        // Re-check on window resize
        window.addEventListener('resize', checkClamping);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkClamping);
        };
    }, [session.reasoning]);

    // Memoize expensive computations
    const formattedTime = (() => {
        const date = safeDate(session.analyzedAt);
        if (!date) return "Invalid time";
        try {
            return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return "Invalid time";
        }
    })();

    const formattedDuration = (() => {
        try {
            return formatDuration(session.durationMs);
        } catch {
            return null;
        }
    })();

    const tokenDisplay = safeNumber(session.tokenUsage)?.toLocaleString() ?? null;

    return (
        <div className="group px-4 py-3 transition-colors hover:bg-muted/30">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <time className="font-medium">{formattedTime}</time>
                {tokenDisplay !== null && (
                    <>
                        <span className="opacity-30">•</span>
                        <span>{tokenDisplay} tokens</span>
                    </>
                )}
                {formattedDuration && (
                    <>
                        <span className="opacity-30">•</span>
                        <span>{formattedDuration}</span>
                    </>
                )}
            </div>

            {session.reasoning && (
                <div className="mt-1">
                    <p
                        ref={reasoningRef}
                        className={`text-sm leading-relaxed text-foreground/85 ${!isReasoningExpanded ? 'line-clamp-2' : ''}`}
                    >
                        {session.reasoning}
                    </p>
                    {isClamped && (
                        <button
                            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                            className="mt-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                        >
                            {isReasoningExpanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}            {Array.isArray(session.toolCalls) && session.toolCalls.length > 0 && (
                <div className="mt-1.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {session.toolCalls.map((call, idx) => {
                            // Validate tool call structure
                            if (typeof call.tool !== "string") {
                                return null; // Skip malformed tool calls
                            }

                            const args = isObject(call.args) ? call.args : {};
                            const result: unknown = call.result;
                            const keyArgs: Array<string> = [];

                            // Action tools (scheduling changes)
                            const isActionTool = ["propose_interval", "propose_next_time", "pause_until"].includes(
                                call.tool
                            );

                            // Detect errors (safe property access)
                            const hasError =
                                (isObject(result) &&
                                    (result.error !== undefined ||
                                        result.status === "error" ||
                                        result.success === false)) ||
                                (typeof result === "string" &&
                                    result.toLowerCase().includes("error"));

                            // Format args based on tool type (with safe access)
                            if (isObject(args)) {
                                // propose_interval
                                const intervalMs = safeNumber(args.intervalMs);
                                if (intervalMs !== null && intervalMs > 0) {
                                    keyArgs.push(`${intervalMs / 1000}s`);
                                }

                                // pause_until
                                if ("untilIso" in args) {
                                    if (args.untilIso === null) {
                                        keyArgs.push("resume");
                                    } else {
                                        const until = safeDate(args.untilIso);
                                        const formatted = formatDateCompact(until);
                                        if (formatted) {
                                            keyArgs.push(`until ${formatted}`);
                                        }
                                    }
                                }

                                // propose_next_time
                                const nextRunAtIso = safeString(args.nextRunAtIso);
                                if (nextRunAtIso) {
                                    const nextRun = safeDate(nextRunAtIso);
                                    const formatted = formatDateCompact(nextRun);
                                    if (formatted) {
                                        keyArgs.push(`at ${formatted}`);
                                    }
                                }

                                // TTL (should come after main args for better readability)
                                const ttlMinutes = safeNumber(args.ttlMinutes);
                                if (ttlMinutes !== null && ttlMinutes > 0) {
                                    keyArgs.push(`${ttlMinutes}m TTL`);
                                }

                                // get_response_history
                                const limit = safeNumber(args.limit);
                                if (limit !== null) {
                                    keyArgs.push(`limit: ${limit}`);
                                }
                                const offset = safeNumber(args.offset);
                                if (offset !== null && offset > 0) {
                                    keyArgs.push(`offset: ${offset}`);
                                }

                                // submit_analysis
                                const confidence = args.confidence;
                                if (confidence !== null && confidence !== undefined) {
                                    keyArgs.push(`confidence: ${confidence}`);
                                }
                                if (
                                    Array.isArray(args.actions_taken) &&
                                    args.actions_taken.length > 0
                                ) {
                                    keyArgs.push(`actions: ${args.actions_taken.length}`);
                                }

                                // Generic reason (if not already shown and not too long)
                                const reason = safeString(args.reason);
                                if (
                                    reason &&
                                    keyArgs.length < 3 &&
                                    reason.length < 40
                                ) {
                                    keyArgs.push(`"${reason}"`);
                                }
                            }

                            const argsDisplay = keyArgs.length > 0 ? keyArgs.join(", ") : "";

                            // Check success based on tool result structure (safe)
                            const hasResult = result !== null && result !== undefined;
                            const isSuccess =
                                !hasError &&
                                hasResult &&
                                (isObject(result)
                                    ? result.success === true ||
                                    result.status === "analysis_complete" ||
                                    result.status === "ok" ||
                                    result.found === true ||
                                    (result.count !== undefined &&
                                        result.responses !== undefined)
                                    : typeof result === "string" &&
                                    result.length > 0 &&
                                    !result.toLowerCase().includes("error"));

                            const isExpanded = expandedToolIndex === idx;

                            return (
                                <div key={idx} className="w-full">
                                    <button
                                        onClick={() => setExpandedToolIndex(isExpanded ? null : idx)}
                                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono transition-all hover:ring-2 hover:ring-offset-1 ${hasError
                                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 hover:ring-red-500/40'
                                            : isActionTool
                                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:ring-blue-500/40'
                                                : 'bg-muted/40 hover:ring-muted-foreground/20'
                                            }`}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                                        <span className="text-foreground/75">{call.tool}</span>
                                        {argsDisplay && <span className="text-muted-foreground/60">({argsDisplay})</span>}
                                        {hasError && <AlertCircle className="h-3 w-3 text-red-600/90" />}
                                        {isSuccess && <Check className="h-3 w-3 text-emerald-600/90" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="mt-2 ml-6 rounded-md border border-muted bg-muted/20 p-3 space-y-2">
                                            <div>
                                                <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Arguments
                                                </h4>
                                                <pre className="text-xs text-foreground/70 max-h-32 overflow-y-auto">
                                                    {safeStringify(args, "[Unable to serialize]")}
                                                </pre>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Result
                                                </h4>
                                                <pre className="text-xs text-foreground/70 max-h-32 overflow-y-auto">
                                                    {safeStringify(result, "[Unable to serialize]")}
                                                </pre>
                                            </div>
                                            {/* Display helpful hints from result (safe) */}
                                            {isObject(result) && (
                                                <>
                                                    {(result.hasMore ||
                                                        typeof result.tokenSavingNote ===
                                                        "string") && (
                                                            <div className="pt-2 border-t border-muted text-xs text-muted-foreground space-y-1">
                                                                {result.hasMore && (
                                                                    <p>
                                                                        💡 More results available -
                                                                        increase limit or offset
                                                                    </p>
                                                                )}
                                                                {typeof result.tokenSavingNote ===
                                                                    "string" && (
                                                                        <p>
                                                                            💡{" "}
                                                                            {String(
                                                                                result.tokenSavingNote
                                                                            )}
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AISessionItem;
