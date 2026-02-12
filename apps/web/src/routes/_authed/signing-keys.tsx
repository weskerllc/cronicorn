import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";

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
import { Button } from "@cronicorn/ui-library/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cronicorn/ui-library/components/dialog";
import { toast } from "@cronicorn/ui-library/lib/utils";

import { EmptyCTA } from "@/components/cards/empty-cta";
import { CodeDisplay } from "@/components/composed/code-display";
import { PageHeader } from "@/components/composed/page-header";
import { InlineBadge } from "@/components/primitives/inline-badge";
import { PageSection } from "@/components/primitives/page-section";
import {
  SIGNING_KEY_QUERY_KEY,
  createSigningKey,
  rotateSigningKey,
  signingKeyQueryOptions,
} from "@/lib/api-client/queries/signing-keys.queries";

export const Route = createFileRoute("/_authed/signing-keys")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(signingKeyQueryOptions());
  },
  component: SigningKeysPage,
});

function SigningKeysPage() {
  const queryClient = useQueryClient();
  const { data: keyInfo } = useSuspenseQuery(signingKeyQueryOptions());

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const createMutation = useMutation({
    mutationFn: createSigningKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...SIGNING_KEY_QUERY_KEY] });
      setGeneratedKey(data.rawKey);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: rotateSigningKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...SIGNING_KEY_QUERY_KEY] });
      setGeneratedKey(data.rawKey);
      setShowRotateConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      toast.success("Signing key copied to clipboard!");
    }
  };

  return (
    <>
      <PageHeader
        text="Webhook Signing"
        description="Manage your webhook signing key for verifying request authenticity"
      />

      <PageSection>
        {keyInfo.hasKey ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Signing Key</p>
                <div className="flex items-center gap-3">
                  <InlineBadge variant="code">{keyInfo.keyPrefix}...</InlineBadge>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowRotateConfirm(true)}
                disabled={rotateMutation.isPending}
              >
                <RefreshCw className="size-4" />
                Rotate Key
              </Button>
            </div>

            <div className="flex gap-6 text-sm text-muted-foreground">
              {keyInfo.createdAt && (
                <span>Created: {new Date(keyInfo.createdAt).toLocaleDateString()}</span>
              )}
              {keyInfo.rotatedAt && (
                <span>Last rotated: {new Date(keyInfo.rotatedAt).toLocaleDateString()}</span>
              )}
            </div>

            <Alert>
              <AlertDescription>
                Use this key to verify that incoming webhook requests originate from Cronicorn.
                Include the key in your HMAC-SHA256 signature verification logic.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <EmptyCTA
            title="No Signing Key"
            description="Generate a signing key to verify the authenticity of webhook requests sent to your endpoints."
            action={
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <KeyRound className="size-4" />
                {createMutation.isPending ? "Generating..." : "Generate Key"}
              </Button>
            }
          />
        )}
      </PageSection>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey(null)}>
        <DialogContent className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-6 text-primary" />
              <DialogTitle>Signing Key Generated</DialogTitle>
            </div>
            <DialogDescription>
              Make sure to copy your signing key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
            <CodeDisplay
              code={generatedKey ?? ""}
              maxHeight="100px"
              enableCopy={true}
            />

            <Button onClick={handleCopyKey} className="w-full">
              <Copy className="size-4" />
              Copy to Clipboard
            </Button>

            <Alert>
              <AlertDescription>
                <strong>Security Warning:</strong> Store this key securely. You will need it to
                verify webhook signatures on your server.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button onClick={() => setGeneratedKey(null)}>I&apos;ve Saved My Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Confirmation Dialog */}
      <AlertDialog open={showRotateConfirm} onOpenChange={setShowRotateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Signing Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate your current signing key and generate a new one.
              Any services using the current key will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateMutation.mutate()}
              disabled={rotateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rotateMutation.isPending ? "Rotating..." : "Rotate Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
