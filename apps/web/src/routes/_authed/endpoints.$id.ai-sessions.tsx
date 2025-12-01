import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@cronicorn/ui-library/components/pagination";

import { Brain } from "lucide-react";
import { AISessionItem } from "@/components/ai/session-item";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { PageSection } from "@/components/primitives/page-section";
import { sessionsQueryOptions } from "@/lib/api-client/queries/sessions.queries";
import { formatDuration } from "@/lib/endpoint-utils";

export const Route = createFileRoute("/_authed/endpoints/$id/ai-sessions")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      sessionsQueryOptions(params.id, { limit: 20, offset: 0 })
    );
  },
  component: AISessionsPage,
});

function AISessionsPage() {
  const { id } = Route.useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const offset = (currentPage - 1) * itemsPerPage;
  const { data } = useSuspenseQuery(
    sessionsQueryOptions(id, { limit: itemsPerPage, offset })
  );

  const totalPages = Math.ceil(data.total / itemsPerPage);

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
            {/* Date header - only show if multiple days */}
            {Object.keys(sessionsByDate).length > 1 && (
              <div className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {date}
              </div>
            )}

            <div className="divide-y divide-border/20 rounded-md border border-border/20 overflow-hidden bg-background">
              {sessions.map((session: SessionType) => (
                <AISessionItem key={session.id} session={session} formatDuration={formatDuration} />
              ))}
            </div>
          </div>
        ))}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, data.total)} of {data.total}
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </PageSection>
  );
}
