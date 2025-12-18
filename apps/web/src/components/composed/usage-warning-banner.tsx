import { Alert, AlertDescription, AlertTitle } from "@cronicorn/ui-library/components/alert";
import { Button } from "@cronicorn/ui-library/components/button";
import { Link } from "@tanstack/react-router";
import { IconAlertCircle, IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { UsageWarning } from "@/lib/usage-helpers";
import { formatUsagePercentage } from "@/lib/usage-helpers";

interface UsageWarningBannerProps {
  warning: UsageWarning;
}

/**
 * UsageWarningBanner - Displays a prominent alert when usage approaches or exceeds tier limits.
 * 
 * Features:
 * - Shows warning (80-94%) or critical (95%+) states
 * - Can be dismissed for the current session
 * - Provides link to detailed usage page
 * - Uses semantic colors (yellow for warning, red for critical)
 */
export function UsageWarningBanner({ warning }: UsageWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isCritical = warning.level === "critical";
  const Icon = isCritical ? IconAlertCircle : IconAlertTriangle;
  const variant = isCritical ? "destructive" : "default";

  const percentage = formatUsagePercentage(warning.metric.used, warning.metric.limit);
  const title = isCritical
    ? `${warning.metric.label} limit reached`
    : `${warning.metric.label} nearing limit`;

  return (
    <Alert variant={variant} className="relative">
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            You've used {warning.metric.used.toLocaleString()} of {warning.metric.limit.toLocaleString()} ({percentage}). 
            {isCritical && " New operations may be blocked."}
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/usage">View Usage</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss warning"
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
