import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Brain } from "lucide-react";
import { PageSection } from "@/components/primitives/page-section";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { sessionsQueryOptions } from "@/lib/api-client/queries/sessions.queries";
import { AISessionItem } from "@/components/ai/session-item";
import { formatDuration } from "@/lib/endpoint-utils";

const sessionsSearchSchema = z.object({
  limit: z.coerce.number().int().positive().optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export const Route = createFileRoute("/_authed/endpoints/$id/ai-sessions")({
  validateSearch: sessionsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, context, deps }) => {
    await context.queryClient.ensureQueryData(
      sessionsQueryOptions(params.id, { limit: deps.search.limit })
    );
  },
  component: AISessionsPage,
});

function AISessionsPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();

  const { data } = useSuspenseQuery(
    sessionsQueryOptions(id, { limit: search.limit ?? 20, offset: search.offset ?? 0 })
  );

  if (data.sessions.length === 0) {
    return (
      <PageSection>
        <EmptyCTA
          icon={Brain}
          title="No AI Analysis Sessions"
          description="AI analysis sessions will appear here once the AI planner has analyzed this endpoint."
        />
      </PageSection>
    );
  }

  // Group sessions by date for optional date headers
  const sessionsByDate = data.sessions.reduce((acc, session) => {
    const date = new Date(session.analyzedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <PageSection>
      <div className="space-y-8">
        {Object.entries(sessionsByDate).map(([date, sessions]: [string, any]) => (
          <div key={date}>
            {/* Date header - only show if multiple days */}
            {Object.keys(sessionsByDate).length > 1 && (
              <div className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {date}
              </div>
            )}

            <div className="divide-y divide-border/20 rounded-md border border-border/20 overflow-hidden bg-background">
              {sessions.map((session: any) => (
                <AISessionItem key={session.id} session={session} formatDuration={formatDuration} />
              ))}
            </div>
          </div>
        ))}

        {/* Pagination controls */}
        <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <div>
            {data.sessions.length > 0 && (
              <span>
                Showing {(search.offset ?? 0) + 1}–{(search.offset ?? 0) + data.sessions.length} of {data.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              resetScroll={false}
              search={(s: any) => ({ ...s, offset: Math.max(0, (s?.offset ?? 0) - (s?.limit ?? 20)) })}
              className={`px-3 py-1 rounded-md border border-border/20 transition-colors ${(search.offset ?? 0) === 0
                ? 'opacity-50 pointer-events-none'
                : 'hover:bg-muted/30'
                }`}
            >
              Previous
            </Link>
            <Link
              resetScroll={false}
              search={(s: any) => ({ ...s, offset: (s?.offset ?? 0) + (s?.limit ?? 20) })}
              className={`px-3 py-1 rounded-md border border-border/20 transition-colors ${data.sessions.length < (search.limit ?? 20)
                ? 'opacity-50 pointer-events-none'
                : 'hover:bg-muted/30'
                }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
