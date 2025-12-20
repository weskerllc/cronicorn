import type { GetSubscriptionStatusResponse } from "@/lib/api-client/queries/subscriptions.queries";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export interface RefundUiState {
    showSection: boolean;
    hasEligibilityData: boolean;
    canRequestRefund: boolean;
    statusLabel: string;
    statusVariant: BadgeVariant;
    expiresAt: Date | null;
    daysLeft: number | null;
    isRefundIssued: boolean;
    isRefundPending: boolean;
    refundWindowExpired: boolean;
}

export function deriveRefundUiState(
    input: Pick<GetSubscriptionStatusResponse, "tier" | "refundEligibility">,
    now: Date = new Date(),
): RefundUiState {
    const showSection = input.tier === "pro";

    if (!showSection) {
        return {
            showSection: false,
            hasEligibilityData: false,
            canRequestRefund: false,
            statusLabel: "hidden",
            statusVariant: "outline",
            expiresAt: null,
            daysLeft: null,
            isRefundIssued: false,
            isRefundPending: false,
            refundWindowExpired: false,
        };
    }

    const eligibility = input.refundEligibility;
    const hasEligibilityData = Boolean(eligibility);
    const status = eligibility?.status ?? "unknown";
    const statusVariant = pickStatusVariant(status);
    const isRefundIssued = status === "issued";
    const isRefundPending = status === "requested";
    const expiresAt = eligibility?.expiresAt ? new Date(eligibility.expiresAt) : null;

    const canRequestRefund = Boolean(eligibility?.eligible && !isRefundIssued);
    const daysLeft = canRequestRefund && expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_IN_MS))
        : null;

    const refundWindowExpired = Boolean(
        hasEligibilityData
        && !canRequestRefund
        && !isRefundIssued
        && (status === "expired" || (expiresAt && expiresAt.getTime() <= now.getTime())),
    );

    return {
        showSection,
        hasEligibilityData,
        canRequestRefund,
        statusLabel: status,
        statusVariant,
        expiresAt,
        daysLeft,
        isRefundIssued,
        isRefundPending,
        refundWindowExpired,
    };
}

function pickStatusVariant(status: string): BadgeVariant {
    switch (status) {
        case "issued":
            return "secondary";
        case "eligible":
        case "requested":
            return "default";
        case "expired":
            return "outline";
        default:
            return "outline";
    }
}
