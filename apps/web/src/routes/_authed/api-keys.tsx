import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IconDotsVertical } from "@tabler/icons-react";
import { CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cronicorn/ui-library/components/alert-dialog";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cronicorn/ui-library/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";
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
import { toast } from "@cronicorn/ui-library/lib/utils";

import { DataTable } from "../../components/data-table";
import { EmptyCTA } from "../../components/empty-cta";
import { PageHeader } from "../../components/page-header";
import { PageSection } from "@/components/sections";
import type { ColumnDef } from "@tanstack/react-table";
import type { CreateApiKeyInput } from "@/lib/api-client/queries/api-keys.queries";
import {
  apiKeysQueryOptions,
  createApiKey,
  deleteApiKey,
} from "@/lib/api-client/queries/api-keys.queries";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  expiresIn: z.string(),
});

type CreateApiKeyForm = z.infer<typeof createApiKeySchema>;


export const Route = createFileRoute("/_authed/api-keys")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(apiKeysQueryOptions());
  },
  component: APIKeysPage,
});

type ApiKeyRow = {
  id: string;
  name: string | null;
  prefix: string | null;
  start: string | null;
  createdAt: Date;
  expiresAt: Date | null;
};

function APIKeysPage() {
  const queryClient = useQueryClient();
  const { data: apiKeys } = useSuspenseQuery(apiKeysQueryOptions());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.key);
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteKeyId(null);
      toast.success("API key deleted successfully");
    },
  });

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      toast.success("API key copied to clipboard!");
    }
  };

  const columns: Array<ColumnDef<ApiKeyRow>> = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || "Unnamed"}</span>
      ),
    },
    {
      accessorKey: "start",
      header: "Key Preview",
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {row.original.prefix && row.original.start
            ? `${row.original.prefix}${row.original.start}...`
            : row.original.start
              ? `${row.original.start}...`
              : "••••••••"}
        </code>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => {
        if (!row.original.expiresAt) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }
        const isExpired = new Date(row.original.expiresAt) < new Date();
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
              {new Date(row.original.expiresAt).toLocaleDateString()}
            </span>
            {isExpired && <Badge variant="destructive">Expired</Badge>}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setDeleteKeyId(row.original.id)}
              className="text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        text="API Keys"
        description="Manage API keys for programmatic access to your scheduled jobs"
        slotRight={
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={createMutation.isPending}
          >
            <Plus className="size-4" />
            Generate New Key
          </Button>
        }
      />

      <PageSection>
        {apiKeys.length === 0 ? (
          <EmptyCTA
            title="No API Keys Yet"
            description="Create your first API key to get started"
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={apiKeys}
              searchKey="name"
              searchPlaceholder="Search API keys..."
              emptyMessage="No API keys found."
              enablePagination={true}
              defaultPageSize={10}
            />

            <Alert>
              <AlertDescription>
                <strong>Important:</strong> API keys are only shown once upon creation. Make
                sure to copy and save them securely.
              </AlertDescription>
            </Alert>
          </>
        )}
      </PageSection>

      {/* Create API Key Dialog */}
      <CreateApiKeyDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={(input) => createMutation.mutate(input)}
        isLoading={createMutation.isPending}
      />

      {/* Generated Key Dialog */}
      <GeneratedKeyDialog
        open={!!generatedKey}
        onOpenChange={(open) => !open && setGeneratedKey(null)}
        apiKey={generatedKey || ""}
        onCopy={handleCopyKey}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this API key
              and revoke its access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && deleteMutation.mutate(deleteKeyId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateApiKeyInput) => void;
  isLoading: boolean;
}) {
  const form = useForm<CreateApiKeyForm>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      expiresIn: "never",
    },
  });

  const handleSubmit = (data: CreateApiKeyForm) => {
    const input: CreateApiKeyInput = {
      name: data.name.trim() || "Unnamed Key",
    };

    // Convert expiration selection to seconds
    if (data.expiresIn !== "never") {
      const days = Number.parseInt(data.expiresIn);
      input.expiresIn = days * 24 * 60 * 60;
    }

    onSubmit(input);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for programmatic access. The key will be shown only once.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My API Key" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>A descriptive name for this API key</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>When this key should expire</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GeneratedKeyDialog({
  open,
  onOpenChange,
  apiKey,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  onCopy: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-6 text-primary" />
            <DialogTitle>API Key Created</DialogTitle>
          </div>
          <DialogDescription>
            Make sure to copy your API key now. You won&apos;t be able to see it again!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted border rounded p-3">
            <code className="text-sm break-all block">{apiKey}</code>
          </div>

          <Button onClick={onCopy} className="w-full">
            <Copy className="size-4" />
            Copy to Clipboard
          </Button>

          <Alert>
            <AlertDescription>
              <strong>Security Warning:</strong> Store this key securely. Anyone with this
              key can access your API with your permissions.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>I&apos;ve Saved My Key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
