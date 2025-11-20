import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { CodeDisplay } from "../../components/composed/code-display";
import { PageSection } from "../../components/primitives/page-section";
import { DetailSection } from "../../components/cards/detail-section";
import { InfoField, InfoGrid } from "../../components/cards/info-grid";
import { RelativeTime } from "../../components/composed/relative-time";
import { runQueryOptions } from "@/lib/api-client/queries/runs.queries";
import { PageHeader } from "@/components/composed/page-header";

export const Route = createFileRoute("/_authed/runs/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(runQueryOptions(params.id));
  },
  component: RunDetailsPage,
});

function RunDetailsPage() {
  const { id } = Route.useParams();
  const { data: run } = useSuspenseQuery(runQueryOptions(id));

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" => {
    if (status === "success") return "default";
    if (status === "failure") return "destructive";
    return "secondary";
  };

  return (
    <>
      <PageHeader
        text="Run Details"
        description={`Run #${id}`}
      />

      <PageSection>
        <DetailSection title="Summary">
          <InfoGrid columns={2}>
            <InfoField
              label="Status"
              value={<Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>}
            />
            <InfoField label="Duration" value={`${run.durationMs}ms`} />
            <InfoField
              label="Started At"
              value={<RelativeTime date={run.startedAt} />}
            />
            <InfoField
              label="Finished At"
              value={run.finishedAt ? <RelativeTime date={run.finishedAt} /> : "N/A"}
            />
            {run.source && (
              <InfoField
                label="Triggered By"
                value={
                  <Badge variant="outline" className="capitalize">
                    {run.source.replace(/-/g, " ")}
                  </Badge>
                }
              />
            )}
            {typeof run.attempt === "number" && (
              <InfoField
                label="Attempt"
                value={run.attempt === 0 ? "First run" : `Retry #${run.attempt}`}
              />
            )}
          </InfoGrid>
        </DetailSection>

        {run.endpoint && (
          <DetailSection title="Endpoint Details">
            <InfoGrid columns={1}>
              <InfoField label="Name" value={run.endpoint.name} />
              {run.endpoint.url && (
                <InfoField
                  label="URL"
                  value={<code className="text-sm">{run.endpoint.url}</code>}
                />
              )}
              {run.endpoint.method && (
                <InfoField
                  label="Method"
                  value={<Badge variant="outline">{run.endpoint.method}</Badge>}
                />
              )}
            </InfoGrid>
          </DetailSection>
        )}

        <DetailSection title="Request Details">
          <InfoGrid columns={1}>
            <InfoField
              label="Endpoint ID"
              value={<code className="text-sm">{run.endpointId}</code>}
            />
          </InfoGrid>
        </DetailSection>

        <DetailSection title="Response Details">
          {run.statusCode && (
            <InfoGrid columns={1}>
              <InfoField
                label="Status Code"
                value={
                  <Badge
                    variant={
                      run.statusCode >= 200 && run.statusCode < 300
                        ? "default"
                        : run.statusCode >= 400
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {run.statusCode}
                  </Badge>
                }
              />
            </InfoGrid>
          )}

          {run.errorMessage
            ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Error</p>
                  <CodeDisplay
                    code={run.errorMessage}
                    maxHeight="200px"
                    enableCopy={true}
                    className="mt-2 border-destructive/20"
                  />
                </AlertDescription>
              </Alert>
            )
            : run.responseBody
              ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Response Body:</p>
                  <CodeDisplay
                    code={JSON.stringify(run.responseBody, null, 2)}
                    language="json"
                    maxHeight="400px"
                    enableCopy={true}
                  />
                </div>
              )
              : (
                <p className="text-sm text-muted-foreground italic">No response body captured</p>
              )}
        </DetailSection>
      </PageSection>
    </>
  );
}
