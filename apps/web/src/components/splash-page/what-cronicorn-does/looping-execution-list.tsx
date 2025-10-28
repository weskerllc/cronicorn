"use client";


import { Calendar, Clock, Inbox, Timer, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@cronicorn/ui-library/lib/utils";
import type { LucideIcon } from "lucide-react";

type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
};

type LoopingTimelineProps = {
  items?: Array<TimelineItem>;
  intervalMs?: number;
  loop?: boolean;
  className?: string;
};

const defaultItems: Array<TimelineItem> = [
  {
    id: "wake",
    title: "Wake",
    description: "Agent wakes",
    icon: Clock,
  },
  {
    id: "gather-context",
    title: "Gather Context",
    description: "Reads updates, endpoint results, and context",
    icon: Inbox,
  },

  {
    id: "decide-run",
    title: "Decide & Run",
    description: "Triggers endpoints if conditions match",
    icon: Zap,
  },
  {
    id: "plan-next",
    title: "Plan Next",
    description: "Schedules next invocation time",
    icon: Calendar,
  },
];

export function LoopingTimeline({
  items = defaultItems,
  intervalMs = 1000,
  loop = true,
  className,
}: LoopingTimelineProps) {
  const safeItems = useMemo(
    () => (Array.isArray(items) && items.length > 0 ? items : defaultItems),
    [items],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeItems.length === 0)
      return;
    const id = setInterval(() => {
      setActiveIndex((i) => {
        const next = i + 1;
        if (next < safeItems.length)
          return next;
        return loop ? 0 : i;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [safeItems.length, intervalMs, loop]);

  return (
    <section className={cn("w-full", className)} aria-label="Chronological execution timeline">
      <div className="sr-only" aria-live="polite">
        {`Active step: ${safeItems[activeIndex]?.title}`}
      </div>

      <ul role="list" className="space-y-3">
        {safeItems.map((item, index) => {
          const Icon = item.icon ?? Timer;
          const isActive = index === activeIndex;

          return (
            <li
              key={item.id}
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className={cn("group relative p-2 rounded-md border backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl bg-muted/50 border-border text-muted-foreground shadow-muted/50", { "bg-emerald-50/90 text-emerald-700 dark:text-emerald-300 shadow-emerald-100/50 dark:shadow-emerald-900/20 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40": isActive })}
            >

              {/* Subtle inner glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-background/20 to-transparent pointer-events-none" />

              <div className="relative flex gap-2 items-start flex-col">
                <div className="flex items-center gap-2">

                  <Icon className="size-4" />
                  <span className="text-xs font-semibold text-muted-foreground flex-auto truncate uppercase tracking-[0.1em] opacity-80">
                    {item.title}
                  </span>

                </div>

                <div className="text-sm font-medium text-foreground/85 tabular-nums tracking-tight">
                  {item.description}
                </div>

              </div>

            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default LoopingTimeline;
