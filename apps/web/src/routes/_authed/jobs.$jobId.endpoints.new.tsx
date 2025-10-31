import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
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
import { Textarea } from "@cronicorn/ui-library/components/textarea";

import { PageHeader } from "../../components/page-header";
import type { CreateEndpointForm } from "@/lib/endpoint-forms";
import { createEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";
import {
  createEndpointSchema,
  transformCreatePayload,
} from "@/lib/endpoint-forms";

export const Route = createFileRoute("/_authed/jobs/$jobId/endpoints/new")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
  },
  component: CreateEndpointPage,
});

function CreateEndpointPage() {
  const { jobId } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<CreateEndpointForm>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: {
      scheduleType: "interval",
      name: "",
      url: "",
      method: "GET",
      headers: [],
      bodyJson: "",
    },
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
    control: form.control,
    name: "headers",
  });

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: CreateEndpointForm) => {
      const payload = transformCreatePayload(data);
      return createEndpoint(jobId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "endpoints"] });
      navigate({ to: "/jobs/$id", params: { id: jobId } });
    },
  });

  const handleFormSubmit = async (data: CreateEndpointForm) => {
    await mutateAsync(data);
  };

  const onCancel = () => {
    navigate({ to: "/jobs/$id", params: { id: jobId } });
  };

  return (
    <>
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link to="/jobs/$id" params={{ id: jobId }}>
            ← Back to {job.name}
          </Link>
        </Button>
      </div>

      <PageHeader
        text="Add Endpoint"
        description={`Create a new endpoint for ${job.name}`}
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to create endpoint"}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Endpoint Fields */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure the basic endpoint details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fetch Users API" {...field} disabled={isPending} />
                    </FormControl>
                    <FormDescription>A descriptive name for this endpoint</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Fetches user data for analytics dashboard"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Endpoint-specific context: what it does, response schema, thresholds
                    </FormDescription>
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
                        disabled={isPending}
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
                      disabled={isPending}
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
            </CardContent>
          </Card>

          {/* Schedule Fields */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Configure when this endpoint should run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        disabled={isPending}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="interval" id="interval" />
                          <Label htmlFor="interval" className="font-normal cursor-pointer">
                            Interval (minutes)
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
                      Choose between a simple interval or advanced cron scheduling
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("scheduleType") === "interval" && (
                <FormField
                  control={form.control}
                  name="baselineIntervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g., 15"
                          {...field}
                          disabled={isPending}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : "")
                          }
                        />
                      </FormControl>
                      <FormDescription>How often should this endpoint run?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("scheduleType") === "cron" && (
                <FormField
                  control={form.control}
                  name="baselineCron"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 0 9 * * 1-5"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Use standard cron format: minute hour day month weekday
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Headers Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Request Headers</CardTitle>
              <CardDescription>
                Optional headers to include with each request
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
                            disabled={isPending}
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
                            disabled={isPending}
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
                    disabled={isPending}
                    className="mb-2"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendHeader({ key: "", value: "" })}
                disabled={isPending}
              >
                <Plus className="size-4 mr-2" />
                Add Header
              </Button>
            </CardContent>
          </Card>

          {/* Request Body (for POST/PUT/PATCH/DELETE) */}
          {form.watch("method") !== "GET" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Request Body</CardTitle>
                <CardDescription>
                  JSON payload to send with {form.watch("method")} requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="bodyJson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>JSON Body (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={'{\n  "key": "value"\n}'}
                          rows={8}
                          className="font-mono text-sm"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter valid JSON. Will be parsed and validated before submission.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Advanced Configuration */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Advanced Configuration</CardTitle>
                  <CardDescription>
                    Optional timeout, execution limits, and AI scheduling constraints
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? (
                    <>
                      <ChevronUp className="size-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeoutMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 30000"
                            {...field}
                            disabled={isPending}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          HTTP request timeout in milliseconds
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxExecutionTimeMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Execution Time (ms)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1800000"
                            placeholder="e.g., 60000 (1 min)"
                            {...field}
                            disabled={isPending}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Lock duration for distributed execution (max: 30 min)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxResponseSizeKb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Response Size (KB)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 1024"
                            {...field}
                            disabled={isPending}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum response body size to capture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">AI Scheduling Constraints</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minIntervalMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Interval (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 5"
                              {...field}
                              disabled={isPending}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum time between AI-adjusted runs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxIntervalMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Interval (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 60"
                              {...field}
                              disabled={isPending}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum time between AI-adjusted runs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" disabled={isPending} onClick={onCancel}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.formState.isDirty}>
              <Save className="size-4" />
              {isPending ? "Creating..." : "Create Endpoint"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
