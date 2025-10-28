"use client";

import { cn } from "@cronicorn/ui-library/lib/utils";
import { TimelineConditionCard } from "./timeline-condition";

import { TimelineCurrentIndicator } from "./timeline-current-indicator";
import { TimelineExecutionDot } from "./timeline-execution";
import { useTimeline } from "./use-timeline";
import type { TimelineScenario } from "./timeline-types";

export default function DynamicScheduleTimeline({ scenario }: { scenario: TimelineScenario }) {
  const { steps, config, description, name } = scenario;
  const { currentData, currentStep } = useTimeline({ steps, config });

  const currentTime = currentData?.executions[currentData.executions.length - 1]?.time || 0;

  return (
    <div className={cn("w-full max-w-5xl mx-auto lg:h-full ")}>
      {/* Main Timeline Component with enhanced styling */}
      <div
        className="relative bg-background/70 lg:h-full backdrop-blur-xl rounded-md border border-border shadow-2xl p-4 lg:p-6 overflow-hidden"
        role="region"
        aria-label="Dynamic Schedule Timeline"
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-muted/30 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/5 to-transparent pointer-events-none" />

        <div className="relative">
          <div className="mb-6 text-left space-y-1 ">
            <p className="text-base font-medium   tracking-tight text-primary/85">{name}</p>

            <p className="text-xs  text-muted-foreground tracking-tight">{description}</p>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 mb-4 gap-6 ">

            {/* Live Conditions Section */}
            <section aria-labelledby="conditions-heading">
              <div className="flex items-center justify-between mb-4 ">
                <div className="flex items-center gap-3">
                  <div className="relative" aria-hidden="true">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/40" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-300 animate-ping opacity-75" />
                  </div>
                  <h2 id="conditions-heading" className="text-sm font-bold text-foreground tracking-wide uppercase">
                    {/* {name} */}
                    Live Conditions
                  </h2>
                </div>
              </div>

              <div className="grid  grid-cols-1  gap-4" role="group" aria-label="System conditions">
                {currentData?.conditions.map(condition => (
                  <TimelineConditionCard key={condition.id} condition={condition} />
                ))}
              </div>
            </section>

            {/* Timeline Section */}
            <section aria-labelledby="timeline-heading">
              <div className="flex items-center justify-between mb-4  ">
                <div className="flex items-center gap-3">
                  <div className="relative" aria-hidden="true">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/40" />
                  </div>
                  <h2 id="timeline-heading" className="text-sm font-bold text-foreground tracking-wide uppercase">
                    {/* {description} */}
                    Execution Timeline
                  </h2>
                </div>

                {/* Enhanced Current Time Display */}
                {config.showCurrentTime && (
                  <div
                    className="flex items-center px-2 "
                    role="status"
                    aria-live="polite"
                    aria-label={`Current time: ${Math.floor(currentTime)} minutes`}
                  >
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {Math.floor(currentTime)}
                      m
                    </span>
                  </div>
                )}
              </div>

              {/* Enhanced Timeline Container */}
              <div
                className="relative h-48 bg-muted/50 rounded-md border border-border shadow-inner overflow-visible px-6 py-12 backdrop-blur-sm"
                role="img"
                aria-label="Timeline visualization showing execution intervals and current progress"
              >
                {/* Enhanced Timeline Base */}
                <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-border transform -translate-y-1/2 rounded-md shadow-sm" />

                {/* Enhanced Time Markers */}
                <div className="absolute inset-0 flex justify-between items-center px-6">
                  {Array.from({ length: 5 }, (_, i) => i * (config.maxTime / 4)).map(time => (
                    <div key={time} className="flex flex-col items-center">
                      <div className="w-px h-3 bg-muted-foreground rounded-full shadow-sm" />
                      <span className="text-xs font-medium text-muted-foreground mt-2 tabular-nums">
                        {time}
                        m
                      </span>
                    </div>
                  ))}
                </div>

                {/* Enhanced Current Time Indicator */}
                <TimelineCurrentIndicator
                  currentTime={currentTime}
                  maxTime={config.maxTime}
                  className="drop-shadow-lg"
                />

                {/* Enhanced Execution Dots */}
                {currentData?.executions.map((execution, index) => (
                  <TimelineExecutionDot
                    key={execution.id}
                    execution={execution}
                    position={index}
                    maxTime={config.maxTime}
                  />
                ))}
              </div>
            </section>

          </div>
          {/* Enhanced Status Caption */}
          <div className="text-center mb-4" role="status" aria-live="polite">
            <div
              key={currentStep}
              className="text-sm font-medium text-muted-foreground animate-in fade-in duration-700 leading-relaxed max-w-lg mx-auto"
            >
              {currentData?.caption}
            </div>
          </div>

          {/* Enhanced Legend */}
          <div
            className="flex items-center justify-center gap-8 pt-6 border-t border-border"
            role="group"
            aria-label="Legend"
          >
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-200/50 dark:ring-emerald-800/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Executed</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-amber-500 dark:bg-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/50 dark:ring-amber-800/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Escalated</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-muted-foreground shadow-lg shadow-muted-foreground/30 ring-2 ring-muted/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Skipped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
