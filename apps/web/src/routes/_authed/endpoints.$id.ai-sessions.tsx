import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Brain } from "lucide-react";
import { AISessionItem } from "@/components/ai/session-item";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { DateHeader } from "@/components/primitives/date-header";
import { PageSection } from "@/components/primitives/page-section";
import { PaginationControls } from "@/components/primitives/pagination-controls";
import { sessionsQueryOptions } from "@/lib/api-client/queries/sessions.queries";
import { formatDuration } from "@/lib/endpoint-utils";

// Schema for URL search params - enables pagination through URL
const aiSessionsSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(20),
});

export const Route = createFileRoute("/_authed/endpoints/$id/ai-sessions")({
  validateSearch: aiSessionsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, context, deps }) => {
    const limit = deps.search.pageSize;
    const offset = (deps.search.page - 1) * deps.search.pageSize;

    await context.queryClient.ensureQueryData(
      sessionsQueryOptions(params.id, { limit, offset })
    );
  },
  component: AISessionsPage,
});

function AISessionsPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();

  const limit = search.pageSize;
  const offset = (search.page - 1) * search.pageSize;
  const { data } = useSuspenseQuery(
    sessionsQueryOptions(id, { limit, offset })
  );

  const totalPages = Math.ceil(data.total / search.pageSize);

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
  type SessionType = (typeof data.sessions)[number];
  const sessionsByDate = data.sessions.reduce<Record<string, Array<SessionType>>>((acc, session) => {
    const date = new Date(session.analyzedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const existing = acc[date] ?? [];
    acc[date] = [...existing, session];
    return acc;
  }, {});

  return (
    <PageSection>
      <div className="space-y-8">
        {Object.entries(sessionsByDate).map(([date, sessions]: [string, Array<SessionType>]) => (
          <div key={date}>
            {/* Date header - always show to provide context regardless of pagination */}
            <DateHeader date={date} className="mb-4" />

            <div className="divide-y divide-border/20 rounded-md border border-border/20 overflow-hidden bg-background">
              {sessions.map((session: SessionType) => (
                <AISessionItem key={session.id} session={session} formatDuration={formatDuration} />
              ))}
            </div>
          </div>
        ))}

        {/* Pagination controls - URL-based for sharing/bookmarking */}
        <PaginationControls
          currentPage={search.page}
          totalPages={totalPages}
          pageSize={search.pageSize}
          totalItems={data.total}
          basePath="/endpoints/$id/ai-sessions"
          linkParams={{ id }}
        />
      </div>
    </PageSection>
  );
}
