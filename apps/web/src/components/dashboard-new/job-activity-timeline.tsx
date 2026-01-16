import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Brain, Loader2, Zap } from "lucide-react";

import { ScrollArea } from "@cronicorn/ui-library/components/scroll-area";
import { Button } from "@cronicorn/ui-library/components/button";
import { ToggleGroup, ToggleGroupItem } from "@cronicorn/ui-library/components/toggle-group";

import { DashboardCard } from "./dashboard-card";
import { ActivityEventItem } from "./activity-event-item";
import { dashboardActivityInfiniteQueryOptions } from "@/lib/api-client/queries/dashboard.queries";

type FilterType = "all" | "runs" | "sessions";

interface JobActivityTimelineProps {
  jobId?: string | null;
  jobName?: string;
  /** Start date for the activity range */
  startDate: Date;
  /** End date for the activity range */
  endDate: Date;
}

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function JobActivityTimeline({ jobId, jobName, startDate, endDate }: JobActivityTimelineProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery(
    dashboardActivityInfiniteQueryOptions({
      jobId: jobId ?? undefined,
      startDate,
      endDate,
      eventType: filter,
      limit: PAGE_SIZE,
    })
  );

  // Flatten all pages into single events array
  const allEvents = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.events);
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  const eventsByDate = useMemo(() => {
    return allEvents.reduce<Record<string, typeof allEvents>>((acc, event) => {
      const date = formatDate(new Date(event.timestamp));
      acc[date] = [...(acc[date] ?? []), event];
      return acc;
    }, {});
  }, [allEvents]);

  const title = jobName ? `Activity: ${jobName}` : "Recent Activity";

  const description = allEvents.length === 0 ? (
    <p>No data to display</p>
  ) : filter == 'runs' ? (<p>Showing Runs Only</p>) : filter == 'sessions' ? <p>Showing AI Sessions Only</p> : (
    <p>Runs and AI Sessions</p>
  );

  const filterToggle = (
    <ToggleGroup
      type="single"
      value={filter}
      onValueChange={(value) => value && setFilter(value as FilterType)}
      size="sm"
      variant="outline"
    >
      <ToggleGroupItem value="all" aria-label="Show all events" className="text-xs px-2">
        All
      </ToggleGroupItem>
      <ToggleGroupItem value="runs" aria-label="Show only runs" className="text-xs px-2">
        <Zap className="size-3" />
      </ToggleGroupItem>
      <ToggleGroupItem value="sessions" aria-label="Show only AI sessions" className="text-xs px-2">
        <Brain className="size-3" />
      </ToggleGroupItem>
    </ToggleGroup>
  );

  return (
    <DashboardCard
      title={title}
      description={description}
      className="h-[400px]"
      headerSlot={filterToggle}
    >
      <ScrollArea className="h-full w-full">
        {allEvents.length === 0 ? (
          null
        ) : (
          <div className="p-2 space-y-2">
            {Object.entries(eventsByDate).map(([date, events]) => (
              <div key={date}>
                <div className="px-3 py-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{date}</span>
                </div>
                <div>
                  {events.map((event) => (
                    <ActivityEventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="flex justify-center py-2">
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
