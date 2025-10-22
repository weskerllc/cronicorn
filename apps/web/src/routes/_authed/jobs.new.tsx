import {  CreateJobRequestSchema } from "@cronicorn/api-contracts/jobs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { Save, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@cronicorn/ui-library/components/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@cronicorn/ui-library/components/form";
import { Input } from "@cronicorn/ui-library/components/input";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Textarea } from "@cronicorn/ui-library/components/textarea";

import type {CreateJobRequest} from "@cronicorn/api-contracts/jobs";
import { JOBS_QUERY_KEY, createJob } from "@/lib/api-client/queries/jobs.queries";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authed/jobs/new")({
  component: CreateJobPage,
});

function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateJobRequest>({
    resolver: zodResolver(CreateJobRequestSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: CreateJobRequest) => createJob(data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await navigate({ to: "/jobs/$id", params: { id: data.id } });
    },
  });

  const router = useRouter();
  const canGoBack = useCanGoBack();

  const onCancel = () => {
    router.history.back();
  };

  const handleFormSubmit = async (data: CreateJobRequest) => {
    await mutateAsync(data);
  };

  return (
    <>
      <PageHeader
        text="Create New Job"
        description="Add a new job to start scheduling endpoints"
      />

      <div className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job name" {...field} disabled={isPending} />
                  </FormControl>
                  <FormDescription>Give the job a descriptive name.</FormDescription>
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
                    <Textarea placeholder="Enter job description" {...field} disabled={isPending} />
                  </FormControl>
                  <FormDescription>Describe the job purpose.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" disabled={isPending || !canGoBack} onClick={onCancel}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                <Save className="size-4" />
                {isPending ? "Saving..." : "Create Job"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
