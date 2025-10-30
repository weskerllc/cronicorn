import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Save, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@cronicorn/ui-library/components/button";
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
import { Textarea } from "@cronicorn/ui-library/components/textarea";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";

import { UpdateJobRequestSchema } from "@cronicorn/api-contracts/jobs";
import { PageHeader } from "../../components/page-header";
import type { UpdateJobRequest } from "@cronicorn/api-contracts/jobs";
import { JOBS_QUERY_KEY, jobQueryOptions, updateJob } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/jobs/$id/edit")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(jobQueryOptions(params.id));
  },
  component: EditJobPage,
});

function EditJobPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: job } = useSuspenseQuery(jobQueryOptions(id));

  const form = useForm<UpdateJobRequest>({
    resolver: zodResolver(UpdateJobRequestSchema),
    defaultValues: {
      name: job.name,
      description: job.description || "",
    },
  });

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: UpdateJobRequest) => updateJob(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...JOBS_QUERY_KEY, id] });
      navigate({ to: "/jobs/$id", params: { id } });
    },
  });

  const handleFormSubmit = async (data: UpdateJobRequest) => {
    await mutateAsync(data);
  };

  const onCancel = () => {
    router.history.back();
  };

  return (
    <>
      <PageHeader text="Edit Job" description={`Update details for ${job.name}`} />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to update job"}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Data Sync Job" {...field} disabled={isPending} />
                </FormControl>
                <FormDescription>A descriptive name for this job</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What does this job do?"
                    rows={4}
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>Optional description of what this job does</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" disabled={isPending} onClick={onCancel}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.formState.isDirty}>
              <Save className="size-4" />
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
