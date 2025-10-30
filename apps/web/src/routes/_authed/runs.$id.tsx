import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { PageHeader } from "@/components/page-header";
import { runQueryOptions } from "@/lib/api-client/queries/runs.queries";

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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{run.durationMs}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started At</p>
                <p className="font-medium">{new Date(run.startedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Finished At</p>
                <p className="font-medium">
                  {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {run.endpoint && (
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{run.endpoint.name}</span>
              </div>
              {run.endpoint.url && (
                <div>
                  <span className="text-sm text-muted-foreground">URL:</span>
                  <span className="ml-2 font-mono text-sm">{run.endpoint.url}</span>
                </div>
              )}
              {run.endpoint.method && (
                <div>
                  <span className="text-sm text-muted-foreground">Method:</span>
                  <Badge variant="outline" className="ml-2">{run.endpoint.method}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-muted-foreground">Endpoint ID:</span>
              <span className="ml-2 font-mono text-sm">{run.endpointId}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Details</CardTitle>
          </CardHeader>
          <CardContent>
            {run.statusCode && (
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">Status Code:</span>
                <Badge
                  variant={
                    run.statusCode >= 200 && run.statusCode < 300
                      ? "default"
                      : run.statusCode >= 400
                        ? "destructive"
                        : "secondary"
                  }
                  className="ml-2"
                >
                  {run.statusCode}
                </Badge>
              </div>
            )}

            {run.errorMessage
              ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Error</p>
                    <pre className="text-sm whitespace-pre-wrap">{run.errorMessage}</pre>
                  </AlertDescription>
                </Alert>
              )
              : run.responseBody
                ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Response Body:</p>
                    <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-96">
                      {JSON.stringify(run.responseBody, null, 2)}
                    </pre>
                  </div>
                )
                : (
                  <p className="text-sm text-muted-foreground italic">No response body captured</p>
                )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
