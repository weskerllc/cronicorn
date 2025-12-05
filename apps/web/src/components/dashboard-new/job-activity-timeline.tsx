import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Brain, Check, ChevronRight, Clock, Play } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";
import { ScrollArea } from "@cronicorn/ui-library/components/scroll-area";
import { cn } from "@cronicorn/ui-library/lib/utils";

import { DashboardCard } from "./dashboard-card";
import { jobActivityTimelineQueryOptions } from "@/lib/api-client/queries/dashboard.queries";

interface JobActivityTimelineProps {
  jobId: string | null;
  jobName?: string;
}

type TimeRange = "24h" | "7d" | "30d";

export function JobActivityTimeline({ jobId, jobName }: JobActivityTimelineProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const { data, isPlaceholderData } = useQuery({
    ...jobActivityTimelineQueryOptions(jobId ?? "", { timeRange, limit: 50 }),
    enabled: !!jobId,
    placeholderData: keepPreviousData,
  });

  // Group events by date for display
  const eventsByDate = useMemo(() => {
    if (!data?.events) return {};

    return data.events.reduce<Record<string, typeof data.events>>((acc, event) => {
      const date = new Date(event.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const existing = acc[date] ?? [];
      acc[date] = [...existing, event];
      return acc;
    }, {});
  }, [data?.events]);

  if (!jobId) {
    return (
      <DashboardCard
        title="Job Activity Timeline"
        description="Select a job to view combined runs and AI sessions"
        className="h-[400px]"
      >
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Activity className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Select a job from the health chart to see its activity</p>
        </div>
      </DashboardCard>
    );
  }

  const description = data?.summary ? (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-foreground">{data.summary.runsCount}</span> runs
      <span className="text-muted-foreground">•</span>
      <span className="font-medium text-foreground">{data.summary.sessionsCount}</span> AI sessions
      <span className="text-muted-foreground">•</span>
      <span className={cn(
        "font-medium",
        data.summary.successRate >= 90 ? "text-green-600" : data.summary.successRate >= 70 ? "text-yellow-600" : "text-red-600"
      )}>
        {data.summary.successRate}%
      </span> success
    </div>
  ) : (
    <p className="text-xs">Loading activity...</p>
  );

  return (
    <DashboardCard
      title={jobName ? `Activity: ${jobName}` : "Job Activity Timeline"}
      description={description}
      className="h-[400px]"
      headerSlot={
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[100px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <ScrollArea className="h-full w-full" style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>
        {!data?.events.length ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Activity className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-sm">No activity in this time range</p>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-4">
            {Object.entries(eventsByDate).map(([date, events]) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-0 bg-background py-1.5 border-b border-border/50 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{date}</span>
                </div>

                {/* Events for this date */}
                <div className="space-y-1">
                  {events.map((event) => (
                    <ActivityEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEventId === event.id}
                      onToggleExpand={() => setExpandedEventId(
                        expandedEventId === event.id ? null : event.id
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </DashboardCard>
  );
}

// ==================== Activity Event Item ====================

type ActivityEventItemProps = {
  event: {
    type: "run" | "session";
    id: string;
    endpointId: string;
    endpointName: string;
    timestamp: string;
    status?: string;
    durationMs?: number;
    source?: string;
    reasoning?: string;
    toolCalls?: Array<{ tool: string; args?: unknown; result?: unknown }>;
    tokenUsage?: number;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
};

function ActivityEventItem({ event, isExpanded, onToggleExpand }: ActivityEventItemProps) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isRun = event.type === "run";

  return (
    <div className="group">
      <button
        onClick={onToggleExpand}
        className={cn(
          "w-full flex items-start gap-2 p-2 rounded-md text-left transition-colors",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isExpanded && "bg-accent/30"
        )}
      >
        {/* Icon indicator */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
          isRun
            ? event.status === "success"
              ? "bg-green-100 text-green-600"
              : event.status === "running"
                ? "bg-blue-100 text-blue-600"
                : "bg-red-100 text-red-600"
            : "bg-purple-100 text-purple-600"
        )}>
          {isRun ? (
            event.status === "success" ? <Check className="h-3.5 w-3.5" /> :
              event.status === "running" ? <Play className="h-3.5 w-3.5" /> :
                <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <Brain className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">{time}</span>
            <Badge variant={isRun ? "outline" : "secondary"} className="text-[10px] px-1.5 py-0">
              {isRun ? "Run" : "AI Session"}
            </Badge>
            {isRun && event.status && (
              <Badge
                variant={event.status === "success" ? "default" : event.status === "running" ? "secondary" : "destructive"}
                className="text-[10px] px-1.5 py-0 capitalize"
              >
                {event.status}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <Link
              to="/endpoints/$id"
              params={{ id: event.endpointId }}
              className="text-sm font-medium hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {event.endpointName}
            </Link>
          </div>

          {/* Additional details */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {isRun && event.durationMs !== undefined && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {event.durationMs}ms
              </span>
            )}
            {isRun && event.source && (
              <span className="text-muted-foreground/70">{event.source}</span>
            )}
            {!isRun && event.tokenUsage !== undefined && (
              <span>{event.tokenUsage.toLocaleString()} tokens</span>
            )}
          </div>

          {/* AI reasoning preview (collapsed) */}
          {!isRun && event.reasoning && !isExpanded && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {event.reasoning}
            </p>
          )}
        </div>

        {/* Expand indicator */}
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
          isExpanded && "rotate-90"
        )} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ml-8 mt-1 p-3 rounded-md border bg-muted/30 space-y-2">
          {isRun ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-medium capitalize">{event.status}</span>
                </div>
                {event.durationMs !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-medium">{event.durationMs}ms</span>
                  </div>
                )}
                {event.source && (
                  <div>
                    <span className="text-muted-foreground">Source:</span>{" "}
                    <span className="font-medium">{event.source}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/runs/$id" params={{ id: event.id }}>
                    View Run Details
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              {event.reasoning && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Reasoning:</span>
                  <p className="text-sm mt-1">{event.reasoning}</p>
                </div>
              )}
              {event.toolCalls && event.toolCalls.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Tool Calls:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.toolCalls.map((call, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {call.tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {event.tokenUsage !== undefined && (
                <div className="text-xs text-muted-foreground pt-1">
                  Tokens used: {event.tokenUsage.toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
