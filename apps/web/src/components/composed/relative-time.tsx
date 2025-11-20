import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@cronicorn/ui-library/components/tooltip';
import { formatRelativeTime, formatFullDateTime } from '@/lib/relative-time';

export interface RelativeTimeProps {
  /**
   * The date to display (Date object, ISO string, or timestamp)
   */
  date: Date | string | number;
  
  /**
   * Whether to enable live updates (default: false)
   * When enabled, the component will update automatically based on the elapsed time
   */
  liveUpdate?: boolean;
  
  /**
   * Whether to show a tooltip with the full datetime (default: true)
   */
  showTooltip?: boolean;
  
  /**
   * Additional CSS classes for the wrapper element
   */
  className?: string;
}

/**
 * Calculate the appropriate update interval based on how old the date is
 * - < 1 minute: update every 10 seconds
 * - < 1 hour: update every minute
 * - < 1 day: update every 10 minutes
 * - < 1 week: update every hour
 * - >= 1 week: don't update (static)
 */
function getUpdateInterval(date: Date | string | number): number | null {
  const targetDate = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
  const diffMs = Date.now() - targetDate;
  const diffMin = Math.floor(diffMs / 1000 / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) {
    return 10000; // 10 seconds
  } else if (diffHour < 1) {
    return 60000; // 1 minute
  } else if (diffDay < 1) {
    return 600000; // 10 minutes
  } else if (diffDay < 7) {
    return 3600000; // 1 hour
  }
  
  return null; // Don't update for dates > 1 week old
}

/**
 * A component that displays a date as human-readable relative time
 * (e.g., "2 minutes ago", "yesterday", "in 3 hours")
 * 
 * Features:
 * - Tooltip showing exact datetime
 * - Optional live updates (component refreshes at appropriate intervals)
 * - Handles past and future dates
 * 
 * @example
 * <RelativeTime date={new Date(Date.now() - 300000)} />
 * // Displays: "5 minutes ago" with tooltip showing full date
 * 
 * @example
 * <RelativeTime date={job.createdAt} liveUpdate />
 * // Displays: "2 hours ago" and updates automatically
 */
export function RelativeTime({ 
  date, 
  liveUpdate = false, 
  showTooltip = true,
  className 
}: RelativeTimeProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!liveUpdate) return;

    const interval = getUpdateInterval(date);
    if (interval === null) return;

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, interval);

    return () => clearInterval(timer);
  }, [date, liveUpdate]);

  const relativeText = formatRelativeTime(date, currentTime);
  const fullDateTime = formatFullDateTime(date);

  if (!showTooltip) {
    return <span className={className}>{relativeText}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className} style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'help' }}>
          {relativeText}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{fullDateTime}</p>
      </TooltipContent>
    </Tooltip>
  );
}
