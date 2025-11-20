import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Card } from "@cronicorn/ui-library/components/card";
import { Brain, Clock, Coins, Zap } from "lucide-react";
import { PageSection } from "@/components/primitives/page-section";
import { InfoField, InfoGrid } from "@/components/cards/info-grid";
import { CodeDisplay } from "@/components/composed/code-display";
import { EmptyCTA } from "@/components/cards/empty-cta";
import { sessionsQueryOptions } from "@/lib/api-client/queries/sessions.queries";

const sessionsSearchSchema = z.object({
  limit: z.coerce.number().int().positive().optional().default(20),
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
    sessionsQueryOptions(id, { limit: search.limit ?? 20 })
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

  return (
    <PageSection>
      <div className="space-y-6">
        {data.sessions.map((session: any) => (
          <Card key={session.id} className="p-6">
            {/* Session Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.analyzedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {session.tokenUsage !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Coins className="h-3 w-3" />
                    {session.tokenUsage.toLocaleString()} tokens
                  </Badge>
                )}
                {session.durationMs !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {session.durationMs}ms
                  </Badge>
                )}
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Reasoning
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {session.reasoning}
              </p>
            </div>

            {/* Tool Calls */}
            {session.toolCalls.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Actions Taken</h4>
                <div className="space-y-3">
                  {session.toolCalls.map((call: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {call.tool}
                        </Badge>
                      </div>
                      
                      <InfoGrid columns={1}>
                        <InfoField
                          label="Arguments"
                          value={
                            <CodeDisplay
                              code={JSON.stringify(call.args, null, 2)}
                              language="json"
                              maxHeight="200px"
                            />
                          }
                        />
                        {call.result && (
                          <InfoField
                            label="Result"
                            value={
                              <CodeDisplay
                                code={JSON.stringify(call.result, null, 2)}
                                language="json"
                                maxHeight="200px"
                              />
                            }
                          />
                        )}
                      </InfoGrid>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
