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
  // const variant = isCritical ? "destructive" : "default";

  const percentage = formatUsagePercentage(warning.metric.used, warning.metric.limit);
  const title = isCritical
    ? `${warning.metric.label} limit reached`
    : `${warning.metric.label} nearing limit`;

  return (
    <Alert className='bg-primary text-primary-foreground flex justify-between border-none'>
      <Icon className="h-4 w-4" />
      <div className='flex flex-1 flex-col gap-4'>
        <div className='flex-1 flex-col justify-center gap-1'>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className='text-primary-foreground/80'>
            You've used {warning.metric.used.toLocaleString()} of {warning.metric.limit.toLocaleString()} ({percentage}).
            {isCritical && " New operations may be blocked."}          </AlertDescription>
        </div>
        <div className='flex items-center gap-4'>
          <Button asChild className='bg-secondary/10 focus-visible:bg-secondary/20 hover:bg-secondary/20 h-7 cursor-pointer rounded-md px-2'>
            <Link to="/usage">View Usage</Link>
          </Button>
          <Button variant='secondary' asChild className='h-7 cursor-pointer rounded-md px-2'>
            <Link to="/pricing">View Plans</Link>
          </Button>
        </div>
      </div>
      <button className='size-5 cursor-pointer' onClick={() => setDismissed(true)}>
        <IconX className='size-5' />
        <span className='sr-only'>Close</span>
      </button>
    </Alert>

  );
}
