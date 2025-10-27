import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertCircle, Plus, Save, X, Zap } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@cronicorn/ui-library/components/form";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { RadioGroup, RadioGroupItem } from "@cronicorn/ui-library/components/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { toast } from "sonner";

import { PageHeader } from "../../components/page-header";
import type { UpdateEndpointForm } from "@/lib/endpoint-forms";
import { clearHints, endpointQueryOptions, pauseEndpoint, resetFailures, updateEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";
import {
  endpointToFormData,
  transformUpdatePayload,
  updateEndpointSchema,
} from "@/lib/endpoint-forms";

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
    defaultValues: endpointToFormData(endpoint) as UpdateEndpointForm,
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
    control: form.control,
    name: "headers",
  });

  const watchedScheduleType = form.watch("scheduleType");

  const { mutateAsync: updateMutate, isPending: updatePending, error: updateError } = useMutation({
    mutationFn: async (data: UpdateEndpointForm) => {
      const payload = transformUpdatePayload(data);
      return updateEndpoint(jobId, id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints"] });
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
                  <Input placeholder="e.g., Fetch Users API" {...field} disabled={updatePending} />
                </FormControl>
                <FormDescription>A descriptive name for this endpoint</FormDescription>
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
                  <Input
                    type="url"
                    placeholder="https://api.example.com/users"
                    {...field}
                    disabled={updatePending}
                  />
                </FormControl>
                <FormDescription>The full URL to call for this endpoint</FormDescription>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={updatePending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select HTTP method" />
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

          <FormField
            control={form.control}
            name="scheduleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    disabled={updatePending}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="interval" id="interval" />
                      <Label htmlFor="interval" className="font-normal cursor-pointer">
                        Fixed Interval
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cron" id="cron" />
                      <Label htmlFor="cron" className="font-normal cursor-pointer">
                        Cron Expression
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  Choose how you want to schedule this endpoint
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedScheduleType === "interval" && (
            <FormField
              control={form.control}
              name="baselineIntervalMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interval (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5"
                      min="1"
                      {...field}
                      disabled={updatePending}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>How often should this endpoint run?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchedScheduleType === "cron" && (
            <FormField
              control={form.control}
              name="baselineCron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0 * * * *"
                      {...field}
                      disabled={updatePending}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    5-field format: minute hour day month weekday (e.g., "0 * * * *" for hourly)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Request Headers</CardTitle>
              <CardDescription>
                Add custom headers to be sent with each request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {headerFields.map((headerField, index) => (
                <div key={headerField.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`headers.${index}.key`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Header Name</FormLabel>}
                        <FormControl>
                          <Input
                            placeholder="e.g., Authorization"
                            {...field}
                            disabled={updatePending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`headers.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Header Value</FormLabel>}
                        <FormControl>
                          <Input
                            placeholder="e.g., Bearer your-token"
                            {...field}
                            disabled={updatePending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeHeader(index)}
                    disabled={updatePending}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendHeader({ key: "", value: "" })}
                disabled={updatePending}
              >
                <Plus className="size-4 mr-2" />
                Add Header
              </Button>

              {headerFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No custom headers configured. Click "Add Header" to add one.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={updatePending}>
              <Save className="size-4 mr-2" />
              {updatePending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="size-4 mr-2" />
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
