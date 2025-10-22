import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@cronicorn/ui-library/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";

import { PageHeader } from "../../components/page-header";
import { createEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

const createEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  baselineIntervalMinutes: z.number().int().min(1, "Must be at least 1 minute").optional(),
});

export const Route = createFileRoute("/_authed/jobs/$jobId/endpoints/new")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
  },
  component: CreateEndpointPage,
});

type CreateEndpointForm = z.infer<typeof createEndpointSchema>;

function CreateEndpointPage() {
  const { jobId } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateEndpointForm>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: {
      name: "",
      url: "",
      method: "GET",
      baselineIntervalMinutes: undefined,
    },
  });

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: CreateEndpointForm) => {
      const payload = {
        name: data.name,
        url: data.url,
        method: data.method,
        baselineIntervalMs: data.baselineIntervalMinutes
          ? data.baselineIntervalMinutes * 60 * 1000
          : undefined,
      };
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
    router.history.back();
  };

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

          <FormField
            control={form.control}
            name="baselineIntervalMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baseline Interval (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5"
                    min="1"
                    {...field}
                    disabled={isPending}
                    value={field.value ?? ""}
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

          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>
                Additional configuration options (headers, body, timeout) coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Request headers, body configuration, timeout, and max response size settings will
                be available in a future release.
              </p>
            </CardContent>
          </Card>

          <Separator />

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
