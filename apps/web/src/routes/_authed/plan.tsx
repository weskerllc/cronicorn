import { useState } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import { Label } from "@cronicorn/ui-library/components/label";
import { Textarea } from "@cronicorn/ui-library/components/textarea";
import { DetailSection } from "@/components/cards/detail-section";
import { PageHeader } from "@/components/composed/page-header";
import { PageSection } from "@/components/primitives/page-section";
import { createPortalSession, requestRefund, subscriptionStatusQueryOptions } from "@/lib/api-client/queries/subscriptions.queries";
import { deriveRefundUiState } from "@/lib/subscriptions/refund-helpers";

type RefundFeedback = {
  type: "success" | "error";
  message: string;
};

export const Route = createFileRoute('/_authed/plan')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(subscriptionStatusQueryOptions());
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: subscription } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const queryClient = useQueryClient();
  const [isRefundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundFeedback, setRefundFeedback] = useState<RefundFeedback | null>(null);
  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: (err) => {
      console.error("Portal error:", err);
    },
  });
  const refundMutation = useMutation({
    mutationFn: requestRefund,
    onMutate: () => {
      setRefundFeedback(null);
    },
    onSuccess: () => {
      setRefundReason("");
      setRefundFeedback({
        type: "success",
        message: "Refund issued. Your account will downgrade to Free shortly.",
      });
      // Close dialog after showing success message briefly
      setTimeout(() => {
        setRefundDialogOpen(false);
      }, 2000);
      void queryClient.invalidateQueries({ queryKey: ["subscriptions", "status"] });
    },
    onError: (error) => {
      setRefundFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to request refund",
      });
    },
  });

  const portalError = portalMutation.error;
  const portalErrorMessage = portalError == null
    ? null
    : portalError instanceof Error
      ? portalError.message
      : "Failed to open customer portal";

  const handleManageSubscription = async () => {
    await portalMutation.mutateAsync();
  };

  const refundState = deriveRefundUiState({
    tier: subscription.tier,
    refundEligibility: subscription.refundEligibility,
  });
  const formattedExpiresAt = refundState.expiresAt
    ? refundState.expiresAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const countdownLabel = refundState.daysLeft === null
    ? null
    : refundState.daysLeft === 0
      ? "Less than 1 day left"
      : `${refundState.daysLeft} ${refundState.daysLeft === 1 ? "day" : "days"} left`;
  const trimmedRefundReason = refundReason.trim();
  const MIN_REFUND_REASON_LENGTH = 10;
  const refundConfirmDisabled = refundMutation.isPending || trimmedRefundReason.length < MIN_REFUND_REASON_LENGTH;

  return (
    <>
      <PageHeader
        text="Subscription Plan"
        description="Manage your subscription and billing"
      />

      <PageSection>
        <DetailSection
          title="Current Plan"
          description={
            <>
              You are currently on the <Badge variant="secondary" className="capitalize">{subscription.tier}</Badge> plan
            </>
          }
        >
          {subscription.tier !== "free" && (
            <>
              {portalErrorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{portalErrorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleManageSubscription}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? "Loading..." : "Manage Subscription"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            </>
          )}

          {subscription.tier === "free" && (
            <div className="space-y-2">
              <Button asChild>
                <Link to="/pricing">Upgrade Plan</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Unlock more features with a paid plan
              </p>
            </div>
          )}
        </DetailSection>

        {refundState.showSection && (
          <DetailSection
            title="14-Day Money-Back Guarantee"
            description="Request a full refund on your Pro plan during the initial 14-day window."
          >
            {refundFeedback && (
              <Alert variant={refundFeedback.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{refundFeedback.message}</AlertDescription>
              </Alert>
            )}

            {refundState.hasEligibilityData ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={refundState.statusVariant} className="capitalize">
                    {refundState.statusLabel}
                  </Badge>
                  {refundState.canRequestRefund && countdownLabel && (
                    <Badge variant="secondary">{countdownLabel}</Badge>
                  )}
                  {formattedExpiresAt && (
                    <Badge variant="outline">Expires {formattedExpiresAt}</Badge>
                  )}
                </div>

                {refundState.canRequestRefund && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Issuing a refund downgrades your account to the Free plan immediately. You can re-upgrade
                      anytime.
                    </p>
                    <div className="space-y-2">
                      <Button onClick={() => setRefundDialogOpen(true)}>
                        Request Full Refund
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This action cancels the current billing cycle and disables Pro-only features right away.
                      </p>
                    </div>
                  </div>
                )}

                {refundState.isRefundIssued && (
                  <p className="text-sm text-muted-foreground">
                    Refund issued. Your billing status is Free. Contact support if you still see charges on your
                    statement.
                  </p>
                )}

                {refundState.isRefundPending && (
                  <p className="text-sm text-muted-foreground">
                    Refund request is currently processing. You will receive a confirmation email from Stripe once
                    it completes.
                  </p>
                )}

                {refundState.refundWindowExpired && (
                  <p className="text-sm text-muted-foreground">
                    The 14-day refund window has expired. If you believe this is incorrect, please contact support
                    and share your original payment date.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We couldn’t determine your refund eligibility yet. If you checked out recently, refresh in a few
                minutes or contact support for assistance.
              </p>
            )}
          </DetailSection>
        )}
      </PageSection>

      {refundState.showSection && (
        <AlertDialog
          open={isRefundDialogOpen}
          onOpenChange={(open) => {
            if (!open && refundMutation.isPending) {
              return;
            }
            setRefundDialogOpen(open);
            if (!open) {
              setRefundReason("");
            }
            else {
              // Clear feedback when opening dialog to show fresh state
              setRefundFeedback(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm full refund</AlertDialogTitle>
              <AlertDialogDescription>
                We’ll issue a full refund for your most recent Pro charge and downgrade your workspace to the Free
                tier immediately. This cannot be undone, but you can resubscribe anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {refundFeedback && (
              <Alert variant={refundFeedback.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{refundFeedback.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Share feedback (required, minimum 10 characters)</Label>
              <Textarea
                id="refund-reason"
                placeholder="Let us know why the plan didn’t work out"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                disabled={refundMutation.isPending}
                required
                aria-invalid={trimmedRefundReason.length > 0 && trimmedRefundReason.length < MIN_REFUND_REASON_LENGTH}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Feedback is required (at least 10 characters) and goes straight to the product team—be as candid as you’d like.
              </p>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={refundMutation.isPending}>Go back</AlertDialogCancel>
              <AlertDialogAction
                disabled={refundConfirmDisabled}
                onClick={() => {
                  if (trimmedRefundReason.length < MIN_REFUND_REASON_LENGTH) {
                    return;
                  }
                  void refundMutation.mutateAsync({ reason: trimmedRefundReason });
                }}
              >
                {refundMutation.isPending ? "Processing..." : "Confirm refund"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
