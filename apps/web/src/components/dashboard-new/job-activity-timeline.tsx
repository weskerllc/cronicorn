import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";

import { ScrollArea } from "@cronicorn/ui-library/components/scroll-area";
import { Button } from "@cronicorn/ui-library/components/button";
import { cn } from "@cronicorn/ui-library/lib/utils";

import { DashboardCard } from "./dashboard-card";
import { ActivityEventItem } from "./activity-event-item";
import { dashboardActivityInfiniteQueryOptions } from "@/lib/api-client/queries/dashboard.queries";

interface JobActivityTimelineProps {
  jobId?: string | null;
  jobName?: string;
  timeRange?: "24h" | "7d" | "30d" | "all";
}

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return "text-success";
  if (rate >= 70) return "text-warning";
  return "text-destructive";
}

// Convert "all" to "30d" for the API
function normalizeTimeRange(range: "24h" | "7d" | "30d" | "all" = "7d"): "24h" | "7d" | "30d" {
  return range === "all" ? "30d" : range;
}

export function JobActivityTimeline({ jobId, jobName, timeRange = "7d" }: JobActivityTimelineProps) {
  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery(
    dashboardActivityInfiniteQueryOptions({
      jobId: jobId ?? undefined,
      timeRange: normalizeTimeRange(timeRange),
      limit: PAGE_SIZE,
    })
  );

  // Flatten all pages into single events array
  const allEvents = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.events);
  }, [data]);

  // Get summary from first page (total counts are consistent across pages)
  const summary = data?.pages[0]?.summary;
  const total = data?.pages[0]?.total ?? 0;

  const eventsByDate = useMemo(() => {
    return allEvents.reduce<Record<string, typeof allEvents>>((acc, event) => {
      const date = formatDate(new Date(event.timestamp));
      acc[date] = [...(acc[date] ?? []), event];
      return acc;
    }, {});
  }, [allEvents]);

  const description = summary ? (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-foreground">{summary.runsCount}</span> runs
      <span className="text-muted-foreground">•</span>
      <span className="font-medium text-foreground">{summary.sessionsCount}</span> AI
      <span className="text-muted-foreground">•</span>
      <span className={cn("font-medium", getSuccessRateColor(summary.successRate))}>
        {summary.successRate}%
      </span>
    </div>
  ) : null;

  const title = jobName ? `Activity: ${jobName}` : "Recent Activity";

  return (
    <DashboardCard
      title={title}
      description={description}
      className="h-[400px]"
    >
      <ScrollArea className="h-full w-full">
        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Activity className="size-6 mb-2 opacity-50" />
            <p className="text-sm">No activity</p>
          </div>
        ) : (
          <div className="p-2 space-y-3">
            {Object.entries(eventsByDate).map(([date, events]) => (
              <div key={date}>
                <div className="px-3 py-1">
                  <span className="text-xs font-medium text-muted-foreground">{date}</span>
                </div>
                <div className="space-y-0.5">
                  {events.map((event) => (
                    <ActivityEventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="flex justify-center py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-3 mr-1.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load more (${total - allEvents.length} remaining)`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </DashboardCard>
  );
}
