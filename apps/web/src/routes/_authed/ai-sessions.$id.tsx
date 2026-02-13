import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Brain, Clock, ExternalLink, Zap } from "lucide-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { CodeDisplay } from "../../components/composed/code-display";
import { PageSection } from "../../components/primitives/page-section";
import { DetailSection } from "../../components/cards/detail-section";
import { InfoField, InfoGrid } from "../../components/cards/info-grid";
import { aiSessionQueryOptions } from "@/lib/api-client/queries/sessions.queries";
import { PageHeader } from "@/components/composed/page-header";

export const Route = createFileRoute("/_authed/ai-sessions/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(aiSessionQueryOptions(params.id));
  },
  component: AISessionDetailsPage,
});

function AISessionDetailsPage() {
  const { id } = Route.useParams();
  const { data: session } = useSuspenseQuery(aiSessionQueryOptions(id));

  return (
    <>
      <PageHeader
        text="AI Session Details"
        description={`Session #${id}`}
      />

      <PageSection>
        <DetailSection title="Summary">
          <InfoGrid columns={2}>
            <InfoField
              label="Type"
              value={
                <Badge variant="outline" className="text-violet-500 border-violet-500/30">
                  <Brain className="size-3 mr-1" />
                  AI Analysis
                </Badge>
              }
            />
            <InfoField
              label="Analyzed At"
              value={new Date(session.analyzedAt).toLocaleString()}
            />
            {session.durationMs !== null && (
              <InfoField
                label="Duration"
                value={
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {session.durationMs}ms
                  </span>
                }
              />
            )}
            {session.tokenUsage !== null && (
              <InfoField
                label="Token Usage"
                value={
                  <span className="flex items-center gap-1">
                    <Zap className="size-3" />
                    {session.tokenUsage.toLocaleString()} tokens
                  </span>
                }
              />
            )}
          </InfoGrid>
        </DetailSection>

        <DetailSection title="Endpoint">
          <InfoGrid columns={1}>
            <InfoField
              label="Name"
              value={
                <Link
                  to="/endpoints/$id"
                  params={{ id: session.endpointId }}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {session.endpointName}
                  <ExternalLink className="size-3" />
                </Link>
              }
            />
            <InfoField
              label="Endpoint ID"
              value={<code className="text-sm">{session.endpointId}</code>}
            />
          </InfoGrid>
        </DetailSection>

        {Array.isArray(session.warnings) && session.warnings.length > 0 && (
          <DetailSection title="Warnings">
            <div className="space-y-2">
              {session.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-md border border-error bg-error/15 px-3 py-2 text-sm text-error"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <span className="font-medium">{warning.code}</span>
                    <p className="text-error">{warning.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        <DetailSection title="AI Reasoning">
          {session.reasoning ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm">{session.reasoning}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No reasoning captured</p>
          )}
        </DetailSection>

        <DetailSection title="Tool Calls">
          {session.toolCalls.length > 0 ? (
            <div className="space-y-4">
              {session.toolCalls.map((toolCall, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {toolCall.tool}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Call #{index + 1}
                    </span>
                  </div>

                  {toolCall.args !== undefined && toolCall.args !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Arguments:</p>
                      <CodeDisplay
                        code={JSON.stringify(toolCall.args, null, 2)}
                        language="json"
                        maxHeight="150px"
                        enableCopy={true}
                      />
                    </div>
                  )}

                  {toolCall.result !== undefined && toolCall.result !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Result:</p>
                      <CodeDisplay
                        code={JSON.stringify(toolCall.result, null, 2)}
                        language="json"
                        maxHeight="150px"
                        enableCopy={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No tool calls recorded</p>
          )}
        </DetailSection>
      </PageSection>
    </>
  );
}
