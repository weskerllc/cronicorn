import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useCanGoBack, useRouter } from "@tanstack/react-router";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@cronicorn/ui-library/components/form";
import { Separator } from "@cronicorn/ui-library/components/separator";

import { Input } from "@cronicorn/ui-library/components/input";
import { Textarea } from "@cronicorn/ui-library/components/textarea";

import { CreateJobRequestSchema, type CreateJobRequest } from "@cronicorn/api-contracts/jobs";
import { useForm } from "react-hook-form";
import { createJob, JOBS_QUERY_KEY } from "../lib/api-client/queries/jobs.queries";
import { Button } from "@cronicorn/ui-library/components/button";
import { Save, X } from "lucide-react";

export const Route = createFileRoute("/jobs/new")({
  component: CreateJobPage,
});

function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateJobRequest>({
    resolver: zodResolver(CreateJobRequestSchema),
    defaultValues: {
      name: "",
      description: '',
    },
  });
    const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: CreateJobRequest) => createJob(data),
    onSuccess: async (data) => {
      console.log({data})
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
      await navigate({ to: "/jobs/$id", params: { id: data.id } });
    //   await navigate({ to: "/dashboard/api-keys", params: { apiKeyId: data.id } });
  
    },
  });

   const router = useRouter()
  const canGoBack = useCanGoBack()

  const onCancel = () => {
    router.history.back();
  }

  const handleFormSubmit = async (data: CreateJobRequest) => {
    await mutateAsync(data);
  };

  console.log({isPending, isDirty: form.formState.isDirty})
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Job</h1>

            <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter job name" {...field} disabled={isPending} />
                </FormControl>
                <FormDescription>Give the job a name.</FormDescription>
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
                <FormDescription>Describe the job prompt.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />
          <div className="flex items-center justify-between space-x-2">
         
            <div className="flex items-center gap-2 flex-auto justify-end">
              <Button variant="outline" disabled={isPending || !canGoBack} onClick={onCancel}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                <Save className="size-4" />
                {isPending ? "Saving..." : "Create Job"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

    </div>
  );
}
