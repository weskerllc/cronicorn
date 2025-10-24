import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertCircle, Zap } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card } from "@cronicorn/ui-library/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@cronicorn/ui-library/components/form";
import { Input } from "@cronicorn/ui-library/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { toast } from "@cronicorn/ui-library/lib/utils";

import { PageHeader } from "../../components/page-header";
import { clearHints, endpointQueryOptions, pauseEndpoint, resetFailures, updateEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

const updateEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
});

type UpdateEndpointForm = z.infer<typeof updateEndpointSchema>;

export const Route = createFileRoute("/_authed/jobs/$jobId/endpoints/$id/edit")({
  loader: async ({ params, context }) => {
    const jobPromise = context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
    const endpointPromise = context.queryClient.ensureQueryData(
      endpointQueryOptions(params.jobId, params.id),
    );
    await Promise.all([jobPromise, endpointPromise]);
  },
  component: EditEndpointPage,
});

function EditEndpointPage() {
  const { jobId, id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const { data: endpoint } = useSuspenseQuery(endpointQueryOptions(jobId, id));

  const form = useForm<UpdateEndpointForm>({
    resolver: zodResolver(updateEndpointSchema),
    defaultValues: {
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
    },
  });

  const { mutateAsync: updateMutate, isPending: updatePending, error: updateError } = useMutation({
    mutationFn: async (data: UpdateEndpointForm) => updateEndpoint(jobId, id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints", id] });
      toast.success("Endpoint updated successfully");
    },
  });

  const { mutateAsync: pauseMutate, isPending: pausePending } = useMutation({
    mutationFn: async (pausedUntil: string | null) => pauseEndpoint(id, { pausedUntil }),
    onSuccess: async (_, pausedUntil) => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints", id] });
      toast.success(pausedUntil ? "Endpoint paused for 24 hours" : "Endpoint resumed");
    },
  });

  const { mutateAsync: resetMutate, isPending: resetPending } = useMutation({
    mutationFn: async () => resetFailures(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints", id] });
      toast.success("Failure count reset");
    },
  });

  const { mutateAsync: clearMutate, isPending: clearPending } = useMutation({
    mutationFn: async () => clearHints(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints", id] });
      toast.success("AI hints cleared");
    },
  });

  const handleFormSubmit = async (data: UpdateEndpointForm) => {
    await updateMutate(data);
  };

  const handlePause = async () => {
    const isPaused = endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date();
    const pausedUntil = isPaused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await pauseMutate(pausedUntil);
  };

  const handleResetFailures = async () => {
    await resetMutate();
  };

  const handleClearHints = async () => {
    await clearMutate();
  };

  const onCancel = () => {
    router.history.back();
  };

  const isPaused = endpoint.pausedUntil && new Date(endpoint.pausedUntil) > new Date();
  const hasAIHints = !!(endpoint.aiHintIntervalMs || endpoint.aiHintNextRunAt || endpoint.aiHintReason);
  const isHintExpired = endpoint.aiHintExpiresAt && new Date(endpoint.aiHintExpiresAt) < new Date();

  return (
    <>
      <div className="mb-4">
        <Button variant="link" asChild>
          <Link to="/jobs/$id" params={{ id: jobId }}>
            ← Back to {job.name}
          </Link>
        </Button>
      </div>

      <PageHeader
        text="Edit Endpoint"
        description={`Update configuration for ${endpoint.name}`}
      />

      {hasAIHints && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">AI Scheduling Hint Active</h2>
            {isHintExpired && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>

          <div className="space-y-3">
            {endpoint.aiHintIntervalMs && (
              <div>
                <p className="text-sm text-muted-foreground">Suggested Interval</p>
                <p className="font-medium">
                  {Math.round(endpoint.aiHintIntervalMs / 60000)} minutes
                  <span className="text-sm text-muted-foreground ml-2">
                    ({endpoint.aiHintIntervalMs}ms)
                  </span>
                </p>
              </div>
            )}

            {endpoint.aiHintNextRunAt && (
              <div>
                <p className="text-sm text-muted-foreground">Suggested Next Run</p>
                <p className="font-medium">
                  {new Date(endpoint.aiHintNextRunAt).toLocaleString()}
                </p>
              </div>
            )}

            {endpoint.aiHintExpiresAt && (
              <div>
                <p className="text-sm text-muted-foreground">Hint Expires</p>
                <p className={`font-medium ${isHintExpired ? "text-destructive" : ""}`}>
                  {new Date(endpoint.aiHintExpiresAt).toLocaleString()}
                  {isHintExpired && <span className="ml-2 text-sm">(Expired)</span>}
                </p>
              </div>
            )}

            {endpoint.aiHintReason && (
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="text-sm italic">{endpoint.aiHintReason}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {updateError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{updateError.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endpoint Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HTTP Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={updatePending}>
              {updatePending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <Separator className="my-8" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Endpoint Actions</h2>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={handlePause}
            disabled={pausePending}
          >
            {pausePending ? "Loading..." : isPaused ? "Resume Endpoint" : "Pause Endpoint"}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetFailures}
            disabled={resetPending}
          >
            {resetPending ? "Loading..." : "Reset Failure Count"}
          </Button>
          <Button
            variant="outline"
            onClick={handleClearHints}
            disabled={clearPending}
          >
            {clearPending ? "Loading..." : "Clear AI Hints"}
          </Button>
        </div>

        <Card>
          <h3 className="text-sm font-semibold mb-2">Endpoint State</h3>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify({
              pausedUntil: endpoint.pausedUntil,
              failureCount: endpoint.failureCount,
              lastRunAt: endpoint.lastRunAt,
              nextRunAt: endpoint.nextRunAt,
            }, null, 2)}
          </pre>
        </Card>
      </div>
    </>
  );
}
