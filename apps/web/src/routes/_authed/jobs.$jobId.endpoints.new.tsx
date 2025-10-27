import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Save, X } from "lucide-react";
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

  const form = useForm<CreateEndpointForm>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: {
      scheduleType: "interval",
      name: "",
      url: "",
      method: "GET",
      headers: [],
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
                            field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : "")
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
