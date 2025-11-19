import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Archive, Pause, Play } from "lucide-react";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { ActionsGroup } from "../../components/primitives/actions-group";

import { DetailSection } from "../../components/cards/detail-section";
import { InfoField, InfoGrid } from "../../components/cards/info-grid";
import { PageSection } from "../../components/primitives/page-section";
import {
  JOBS_QUERY_KEY,
  archiveJob,
  endpointsQueryOptions,
  pauseJob,
  resumeJob,
} from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/jobs/$id/")({
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const parentRouteApi = getRouteApi("/_authed/jobs/$id");
  const { job } = parentRouteApi.useLoaderData();
  const { data: endpointsData } = useSuspenseQuery(endpointsQueryOptions(id));

  // Pause job mutation
  const {
    mutateAsync: pauseJobMutation,
    isPending: isPausing,
    error: pauseError,
  } = useMutation({
    mutationFn: () => pauseJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...JOBS_QUERY_KEY, id] });
    },
  });

  // Resume job mutation
  const {
    mutateAsync: resumeJobMutation,
    isPending: isResuming,
    error: resumeError,
  } = useMutation({
    mutationFn: () => resumeJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...JOBS_QUERY_KEY, id] });
    },
  });

  // Archive job mutation
  const {
    mutateAsync: archiveJobMutation,
    isPending: isArchiving,
    error: archiveError,
  } = useMutation({
    mutationFn: () => archiveJob(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      navigate({ to: "/jobs" });
    },
  });

  const handlePause = async () => {
    await pauseJobMutation();
  };

  const handleResume = async () => {
    await resumeJobMutation();
  };

  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this job? This action can be undone by resuming the job.")) {
      await archiveJobMutation();
    }
  };

  const error = pauseError || resumeError || archiveError;
  const isLoading = isPausing || isResuming || isArchiving;

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <PageSection>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred"}
          </AlertDescription>
        </Alert>
      )}

      <DetailSection
        title="Job Information"
        description="View and manage this job's configuration"
      >
        <InfoGrid columns={2}>
          <InfoField
            label="Status"
            value={
              <Badge variant={getStatusVariant(job.status)} className="capitalize">
                {job.status}
              </Badge>
            }
          />
          <InfoField
            label="Endpoints"
            value={`${endpointsData.endpoints.length} endpoint(s)`}
          />
          <InfoField label="Created" value={formatDate(job.createdAt)} />
          <InfoField label="Last Updated" value={formatDate(job.updatedAt)} />
        </InfoGrid>

        {job.description && (
          <InfoField label="Description" value={job.description} fullWidth />
        )}

        <ActionsGroup gap="2" className="border-t pt-4">
          {job.status === "paused" ? (
            <Button
              variant="default"
              onClick={handleResume}
              disabled={isLoading}
            >
              <Play className="size-4" />
              Resume Job
            </Button>
          ) : job.status === "active" ? (
            <Button
              variant="secondary"
              onClick={handlePause}
              disabled={isLoading}
            >
              <Pause className="size-4" />
              Pause Job
            </Button>
          ) : null}

          {job.status !== "archived" && (
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={isLoading}
            >
              <Archive className="size-4" />
              Archive Job
            </Button>
          )}
        </ActionsGroup>
      </DetailSection>

      {endpointsData.endpoints.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          View all endpoints in the{" "}
          <Link to="/jobs/$id/endpoints" params={{ id }} className="text-primary hover:underline">
            Endpoints tab
          </Link>
        </div>
      )}
    </PageSection>
  );
}
